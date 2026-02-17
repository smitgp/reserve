#!/usr/bin/env node
// Simple Library Reservation Tool
//
// Usage: node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00 --resource 565
//
// This script will:
// 1. Split long time periods into 3-hour chunks
// 2. Check availability for each chunk
// 3. Attempt to book all available slots once
// 4. Report success or failure

import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";
import { parseArgs } from "util";

dotenv.config();

const BASE = "https://bibliotheekutrecht.crmplatform.nl";
const GUEST_FORM_URL = `${BASE}/werkplekreserveren-aanmelden?reserveren=true`;

// Configuration
const config = {
  location: process.env.LOCATION || "41",
  type: process.env.TYPE || "36",
  baseEmail: process.env.BASE_EMAIL || "g.smit92@gmail.com"
};

// Time slot class
class TimeSlot {
  constructor(start, end, resource, date) {
    this.start = start;
    this.end = end;
    this.resource = resource;
    this.date = date;
  }

  toString() {
    return `${this.date} ${this.start}-${this.end} (Resource ${this.resource})`;
  }
}

// Split time range into 3-hour chunks
function splitIntoChunks(startTime, endTime, resource, date) {
  const chunks = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let currentH = startH;
  let currentM = startM;
  
  while (currentH < endH || (currentH === endH && currentM < endM)) {
    const chunkStart = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
    
    // Calculate chunk end (max 3 hours)
    let nextH = currentH + 3;
    let nextM = currentM;
    
    // Don't exceed the target time
    if (nextH > endH || (nextH === endH && nextM > endM)) {
      nextH = endH;
      nextM = endM;
    }
    
    const chunkEnd = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
    chunks.push(new TimeSlot(chunkStart, chunkEnd, resource, date));
    
    currentH = nextH;
    currentM = nextM;
  }
  
  return chunks;
}

// Check availability for a date
async function checkAvailability(date, client) {
  try {
    const url = `${BASE}/reserveringen/page/js/reservations.vm?location=${config.location}&type=${config.type}&date=${date}`;
    const response = await client.post(url, "", {
      headers: {
        "Origin": BASE,
        "Referer": `${BASE}/reserveringen/page/reservering.vm?`,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to check availability: ${error.message}`);
    return null;
  }
}

// Check if a slot is available
function isSlotAvailable(slot, availability) {
  // The library API returns times in a "fake UTC" format.
  // For example, 09:00 Dutch time is returned as 08:00Z (during winter/CET).
  // We need to shift our requested local time to match this format for comparison.
  
  const getLibraryTimeStr = (dateStr, timeStr) => {
    // Create a formatter that extracts parts in Amsterdam time
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });

    // Start with a guess: the input time as UTC
    const guess = new Date(`${dateStr}T${timeStr}:00Z`);
    
    // Format our guess as Amsterdam time
    const parts = formatter.formatToParts(guess);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    
    // Construct what the time WOULD be in Amsterdam if it was our guess UTC time
    const amsterdamTimeOfGuess = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    
    // The difference between our guess and what it turned out to be in Amsterdam
    const offset = guess.getTime() - amsterdamTimeOfGuess.getTime();
    
    // Apply that offset to our guess to get the true UTC time for that Amsterdam local time
    return new Date(guess.getTime() + offset).toISOString();
  };

  const slotStartStr = getLibraryTimeStr(slot.date, slot.start);
  const slotEndStr = getLibraryTimeStr(slot.date, slot.end);
  const slotStart = new Date(slotStartStr);
  const slotEnd = new Date(slotEndStr);

  // Check existing reservations
  const hasConflict = availability.reservations.some(reservation => {
    // Compare resources as strings to avoid type mismatches
    if (reservation.resource.toString() !== slot.resource.toString()) return false;
    
    const resStart = new Date(reservation.start);
    const resEnd = new Date(reservation.end);
    return (slotStart < resEnd && slotEnd > resStart);
  });

  if (hasConflict) return { available: false, reason: "occupied" };

  // Check library closing hours
  if (availability.blocks) {
    const isBlocked = availability.blocks.some(block => {
      // Handle resource ID list (could be empty or contain strings/numbers)
      const appliesToResource = !block.resource || block.resource.length === 0 || 
                               block.resource.map(r => r.toString()).includes(slot.resource.toString());
                               
      const appliesToType = !block.type || block.type.length === 0 || 
                           block.type.map(t => t.toString()).includes(config.type.toString());
      
      if (!appliesToResource || !appliesToType) return false;
      
      const blockStart = new Date(block.start);
      const blockEnd = new Date(block.end);
      return (slotStart < blockEnd && slotEnd > blockStart);
    });

    if (isBlocked) return { available: false, reason: "library_closed" };
  }

  return { available: true };
}

// Create and verify a guest account (returns account info for reuse)
async function createGuestAccount(client) {
  try {
    // Get fresh form data
    const formResp = await client.get(GUEST_FORM_URL);
    const html = String(formResp.data || "");
    
    const freshCsrf = html.match(/<input[^>]*name=["']csrf-key["'][^>]*value=["']([^"']+)["']/i)?.[1];
    const freshFormId = html.match(/<input[^>]*name=["']form-id["'][^>]*value=["']([^"']+)["']/i)?.[1];
    const emailFieldName = html.match(/<input[^>]*type=["']email["'][^>]*name=["']([^"']+)["']/i)?.[1] || "form:D1930";
    
    let formAction = html.match(/data-urlIfModified=["']([^"']*engine\?service=recordmanager:form:[^"']+)["']/i)?.[1];
    if (formAction) {
      formAction = formAction.replace(/&amp;/g, '&').replace(/cmd=asksave/i, 'cmd=save');
    }

    if (!freshCsrf || !freshFormId || !formAction) {
      throw new Error("Could not extract form data");
    }

    // Build form data
    const engineBody = process.env.ENGINE_BODY || "";
    const params = new URLSearchParams(engineBody);
    params.set("csrf-key", freshCsrf);
    params.set("form-id", freshFormId);

    // Generate unique email
    const [user, domain] = config.baseEmail.split("@");
    const randomToken = Math.random().toString(36).substring(2, 8);
    const uniqueEmail = `${user}+${randomToken}@${domain}`;
    params.set(emailFieldName, uniqueEmail);

    const engineUrl = formAction.startsWith("http") ? formAction : BASE + formAction;

    // Submit registration
    const engineResp = await client.post(engineUrl, params.toString(), {
      headers: {
        "Origin": BASE,
        "Referer": GUEST_FORM_URL,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });

    // Find verification URL
    let verifUrl = engineResp?.request?.res?.responseUrl || engineResp?.request?.responseURL;
    if (!verifUrl || !/werkplekkenVerificatie\.vm/i.test(verifUrl)) {
      const bodyHtml = typeof engineResp.data === "string" ? engineResp.data : "";
      const match = bodyHtml.match(/\/reserveringen\/werkplekkenVerificatie\.vm\?[^"'<> \n\r]+/i);
      verifUrl = match ? BASE + match[0] : null;
    }

    if (!verifUrl) {
      const thankYouResp = await client.get(`${BASE}/formulieren/bedankpaginaBiebWerkt.vm`, {
        headers: { Origin: BASE, Referer: GUEST_FORM_URL }
      });
      const tyHtml = String(thankYouResp.data || "");
      const match = tyHtml.match(/\/reserveringen\/werkplekkenVerificatie\.vm\?[^"'<> \n\r]+/i);
      verifUrl = match ? BASE + match[0] : null;
    }

    if (!verifUrl) throw new Error("Could not find verification URL");

    // Verify account
    await client.get(verifUrl, { headers: { Origin: BASE, Referer: GUEST_FORM_URL } });

    return { success: true, email: uniqueEmail };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Book a slot using an existing verified account
async function bookSlotWithAccount(slot, client, accountEmail) {
  try {
    // Make reservation
    const reservationBody = new URLSearchParams({
      location: config.location,
      type: config.type,
      date: slot.date,
      start: slot.start,
      end: slot.end,
      resource: slot.resource
    }).toString();

    const res = await client.post(`${BASE}/reserveringen/page/makereservation.vm`, reservationBody, {
      headers: {
        "Origin": BASE,
        "Referer": `${BASE}/reserveringen/page/reservering.vm?`,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });

    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    
    if (/bevestig|geslaagd|gelukt|success|aangemaakt/i.test(text)) {
      return { success: true, email: accountEmail };
    } else {
      return { success: false, error: "Unclear response", response: text.slice(0, 200) };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  const args = parseArgs({
    options: {
      date: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      resource: { type: "string" },
      help: { type: "boolean" }
    }
  });

  if (args.values.help || !args.values.date || !args.values.start || !args.values.end || !args.values.resource) {
    console.log(`
Simple Library Reservation Tool

Usage:
  node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00 --resource 565

Options:
  --date YYYY-MM-DD    Target date
  --start HH:MM        Start time
  --end HH:MM          End time  
  --resource NUM       Resource ID
  --help               Show this help

Example:
  node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00 --resource 565
`);
    process.exit(args.values.help ? 0 : 1);
  }

  const { date, start, end, resource } = args.values;
  
  console.log(`🎯 Attempting to reserve ${date} ${start}-${end} on Resource ${resource}`);

  // Split into 3-hour chunks
  const slots = splitIntoChunks(start, end, resource, date);
  console.log(`📋 Split into ${slots.length} chunks:`);
  slots.forEach(slot => console.log(`   • ${slot.toString()}`));

  // Set up HTTP client
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 20000,
    headers: { "User-Agent": "library-reserve/1.0" }
  }));

  // Check availability
  console.log(`\n🔍 Checking availability...`);
  const availability = await checkAvailability(date, client);
  
  if (!availability || !availability.reservations) {
    console.log("❌ Could not check availability");
    process.exit(1);
  }

  // Filter available slots
  const availableSlots = [];
  const unavailableSlots = [];

  for (const slot of slots) {
    const result = isSlotAvailable(slot, availability);
    if (result.available) {
      availableSlots.push(slot);
      console.log(`✅ Available: ${slot.toString()}`);
    } else {
      unavailableSlots.push({ slot, reason: result.reason });
      if (result.reason === "occupied") {
        console.log(`❌ Occupied: ${slot.toString()}`);
      } else if (result.reason === "library_closed") {
        console.log(`🏛️ Library closed: ${slot.toString()}`);
      }
    }
  }

  if (availableSlots.length === 0) {
    console.log("\n❌ No slots available");
    process.exit(1);
  }

  // Attempt to book available slots (max 2 per guest account)
  console.log(`\n📅 Attempting to book ${availableSlots.length} available slots...`);
  const results = [];
  const RESERVATIONS_PER_ACCOUNT = 2;

  // Group slots into batches of 2 (max per guest account)
  const slotBatches = [];
  for (let i = 0; i < availableSlots.length; i += RESERVATIONS_PER_ACCOUNT) {
    slotBatches.push(availableSlots.slice(i, i + RESERVATIONS_PER_ACCOUNT));
  }

  console.log(`👥 Need ${slotBatches.length} guest account(s) for ${availableSlots.length} slots`);

  for (let batchIndex = 0; batchIndex < slotBatches.length; batchIndex++) {
    const batch = slotBatches[batchIndex];
    console.log(`\n🆔 Guest account ${batchIndex + 1}/${slotBatches.length} (${batch.length} reservations):`);
    
    // Create guest account for this batch
    console.log(`⏳ Creating guest account...`);
    const accountResult = await createGuestAccount(client);
    
    if (!accountResult.success) {
      console.log(`❌ Failed to create guest account: ${accountResult.error}`);
      // Mark all slots in this batch as failed
      for (const slot of batch) {
        results.push({ slot, success: false, error: `Account creation failed: ${accountResult.error}` });
      }
      continue;
    }
    
    console.log(`✅ Created account: ${accountResult.email}`);
    
    // Book slots with this account
    for (const slot of batch) {
      console.log(`⏳ Booking: ${slot.toString()}`);
      const result = await bookSlotWithAccount(slot, client, accountResult.email);
      results.push({ slot, ...result });
      
      if (result.success) {
        console.log(`✅ Success: ${slot.toString()}`);
      } else {
        console.log(`❌ Failed: ${slot.toString()} - ${result.error}`);
      }
      
      // Small delay between bookings on same account
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Longer delay between different guest accounts
    if (batchIndex < slotBatches.length - 1) {
      console.log(`⏳ Preparing next guest account...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log("\n" + "=".repeat(50));
  console.log("📊 FINAL RESULTS");
  console.log("=".repeat(50));
  console.log(`✅ Successfully booked: ${successful.length}/${slots.length} slots`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏸️ Unavailable: ${unavailableSlots.length}`);

  if (successful.length > 0) {
    console.log("\n🎉 Successfully booked:");
    successful.forEach(r => console.log(`   • ${r.slot.toString()} (${r.email})`));
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed to book:");
    failed.forEach(r => console.log(`   • ${r.slot.toString()} (${r.error})`));
  }

  if (unavailableSlots.length > 0) {
    console.log("\n⏸️ Were unavailable:");
    unavailableSlots.forEach(u => console.log(`   • ${u.slot.toString()} (${u.reason})`));
  }

  // Exit with appropriate code
  process.exit(successful.length === availableSlots.length ? 0 : 1);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('reserve.mjs')) {
  main().catch(error => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}