#!/usr/bin/env node
// Simple Library Reservation Tool
//
// Usage: node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00
//
// This script will:
// 1. Fetch all reservations for the given date
// 2. Look for the best available resource (room) for the requested time
// 3. Fallback to chunking (max 3 hours) if no single resource is free all day
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

// Create a fresh HTTP client with its own cookie jar
function createClient() {
  const jar = new CookieJar();
  return wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 20000,
    headers: { "User-Agent": "library-reserve/1.0" }
  }));
}

// Target resources in priority order (558 is first preference)
const PREFERRED_RESOURCES = [
  "558", "559", "560", "561", "562", "563", "564"
];

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
  const resourceReservations = availability.reservations.filter(
    r => r.resource != null && r.resource.toString() === slot.resource.toString()
  );

  if (resourceReservations.length > 0) {
    console.log(`   🔎 [Debug] Resource ${slot.resource} has ${resourceReservations.length} existing reservation(s) on ${slot.date}:`);
    resourceReservations.forEach(r => {
      const localStart = new Date(r.start).toLocaleString('en-GB', {timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit'});
      const localEnd   = new Date(r.end).toLocaleString('en-GB', {timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit'});
      console.log(`      • ${r.start} → ${r.end} (NL: ${localStart}–${localEnd})`);
    });
  }

  const hasConflict = resourceReservations.some(reservation => {
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
    let errorMsg = error.message;
    if (error.response) {
      const respData = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
      errorMsg = `${error.message} - Response: ${respData.slice(0, 200)}`;
    }
    return { success: false, error: errorMsg };
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
    let errorMsg = error.message;
    if (error.response) {
      const respData = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data);
      errorMsg = `${error.message} - Response: ${respData.slice(0, 200)}`;
    }
    return { success: false, error: errorMsg };
  }
}

// Detect a "resource was just reserved by someone else" API response
function isJustReservedError(errorMsg) {
  return typeof errorMsg === "string" && errorMsg.includes("net gereserveerd");
}

// Book a set of slots (strategy 1/2 + batch booking) using a given resource list
async function attemptBookingWithResources(date, start, end, availability, preferredResources) {
  let availableSlots = [];
  const unavailableSlots = [];

  // STRATEGY 1: Look for a single resource that is fully available
  console.log(`🧐 Strategy 1: Looking for a resource available for the ENTIRE duration...`);
  let bestResource = null;

  for (const resId of preferredResources) {
    const fullRangeSlot = new TimeSlot(start, end, resId, date);
    const result = isSlotAvailable(fullRangeSlot, availability);
    if (result.available) {
      bestResource = resId;
      console.log(`   ✅ Found fully available resource: ${resId}`);
      break;
    }
  }

  if (bestResource) {
    availableSlots = splitIntoChunks(start, end, bestResource, date);
    console.log(`   📋 Using resource ${bestResource} for all ${availableSlots.length} chunks`);
  } else {
    // STRATEGY 2: Fallback to chunk-by-chunk selection
    console.log(`   ⏭️ No single resource available for full range. Using Strategy 2: Chunk-by-chunk selection...`);

    const baseChunks = splitIntoChunks(start, end, "TEMP", date);

    for (const chunk of baseChunks) {
      let chunkFound = false;
      for (const resId of preferredResources) {
        chunk.resource = resId;
        const result = isSlotAvailable(chunk, availability);
        if (result.available) {
          availableSlots.push(new TimeSlot(chunk.start, chunk.end, resId, date));
          console.log(`   ✅ Chunk ${chunk.start}-${chunk.end}: Found resource ${resId}`);
          chunkFound = true;
          break;
        }
      }

      if (!chunkFound) {
        console.log(`   ❌ Chunk ${chunk.start}-${chunk.end}: No resources available`);
        unavailableSlots.push({ slot: chunk, reason: "all_resources_occupied" });
      }
    }
  }

  if (availableSlots.length === 0) {
    return { successful: [], failed: [], unavailableSlots };
  }

  // Batch booking
  console.log(`\n📅 Attempting to book ${availableSlots.length} available slots...`);
  const RESERVATIONS_PER_ACCOUNT = 2;

  const slotBatches = [];
  for (let i = 0; i < availableSlots.length; i += RESERVATIONS_PER_ACCOUNT) {
    slotBatches.push(availableSlots.slice(i, i + RESERVATIONS_PER_ACCOUNT));
  }

  console.log(`👥 Need ${slotBatches.length} guest account(s) for ${availableSlots.length} slots (executing in parallel)`);

  const batchResultsArray = await Promise.all(slotBatches.map(async (batch, index) => {
    await new Promise(resolve => setTimeout(resolve, index * 1000));

    const batchClient = createClient();
    const batchResults = [];

    console.log(`\n🆔 Batch ${index + 1}/${slotBatches.length} (${batch.length} slot(s)):`);
    console.log(`⏳ [Batch ${index + 1}] Creating guest account...`);
    const accountResult = await createGuestAccount(batchClient);

    if (!accountResult.success) {
      console.log(`❌ [Batch ${index + 1}] Account creation failed: ${accountResult.error}`);
      return batch.map(slot => ({ slot, success: false, error: `Account creation failed: ${accountResult.error}` }));
    }

    console.log(`✅ [Batch ${index + 1}] Created account: ${accountResult.email}`);

    for (const slot of batch) {
      console.log(`⏳ [Batch ${index + 1}] Booking: ${slot.toString()}`);
      const result = await bookSlotWithAccount(slot, batchClient, accountResult.email);
      batchResults.push({ slot, ...result });

      if (result.success) {
        console.log(`✅ [Batch ${index + 1}] Success: ${slot.toString()}`);
      } else {
        console.log(`❌ [Batch ${index + 1}] Failed: ${slot.toString()} - ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return batchResults;
  }));

  const results = batchResultsArray.flat();
  return {
    successful: results.filter(r => r.success),
    failed: results.filter(r => !r.success),
    unavailableSlots
  };
}

// Main function
async function main() {
  const args = parseArgs({
    options: {
      date: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      help: { type: "boolean" }
    }
  });

  if (args.values.help || !args.values.date || !args.values.start || !args.values.end) {
    console.log(`
Simple Library Reservation Tool (Auto-Selection Mode)

Usage:
  node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00

Options:
  --date YYYY-MM-DD    Target date
  --start HH:MM        Start time
  --end HH:MM          End time  
  --help               Show this help
`);
    process.exit(args.values.help ? 0 : 1);
  }

  const { date, start, end } = args.values;

  console.log(`🎯 Requesting reservation for ${date} from ${start} to ${end}`);

  const client = createClient();

  // Track resources that the booking API confirmed are taken (even if availability API shows them free)
  const knownTakenResources = new Set();
  const allSuccessful = [];
  const allFailed = [];
  const allUnavailable = [];
  const MAX_RESOURCE_RETRIES = PREFERRED_RESOURCES.length;

  for (let attempt = 1; attempt <= MAX_RESOURCE_RETRIES; attempt++) {
    const remainingResources = PREFERRED_RESOURCES.filter(r => !knownTakenResources.has(r));

    if (remainingResources.length === 0) {
      console.log("\n❌ All preferred resources have been confirmed taken. No alternatives left.");
      break;
    }

    if (attempt > 1) {
      const excluded = [...knownTakenResources].join(", ");
      console.log(`\n🔄 Retrying with alternative resources (excluded: ${excluded})...`);
      // Small delay before re-checking to give the API a moment to reflect reality
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🔍 Checking availability for ${remainingResources.length} resource(s)...`);
    const availability = await checkAvailability(date, client);

    if (!availability || !availability.reservations) {
      console.log("❌ Could not check availability");
      console.log(`   🔎 [Debug] Raw response type: ${typeof availability}, keys: ${availability ? Object.keys(availability).join(', ') : 'n/a'}`);
      process.exit(1);
    }

    console.log(`   🔎 [Debug] API returned ${availability.reservations.length} total reservation(s) for ${date}`);

    const { successful, failed, unavailableSlots } = await attemptBookingWithResources(
      date, start, end, availability, remainingResources
    );

    allSuccessful.push(...successful);
    allUnavailable.push(...unavailableSlots);

    if (successful.length > 0) {
      // At least some slots were booked — collect any remaining failures and stop
      allFailed.push(...failed);
      break;
    }

    // Classify failures: "just reserved by someone else" vs other errors
    const justReservedFailed = failed.filter(r => isJustReservedError(r.error));
    const otherFailed = failed.filter(r => !isJustReservedError(r.error));

    if (justReservedFailed.length > 0 && otherFailed.length === 0) {
      // Every failure was a race-condition "just reserved" — identify the taken resources and retry
      const takenNow = [...new Set(justReservedFailed.map(r => r.slot.resource))];
      takenNow.forEach(r => knownTakenResources.add(r));
      console.log(`\n⚠️  Resource(s) [${takenNow.join(", ")}] were just taken by someone else. Trying next resource...`);
      // Don't add these to allFailed yet — we'll retry with other resources
    } else {
      // Mix of error types or non-recoverable failures
      allFailed.push(...failed);
      break;
    }
  }

  // Final summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 FINAL RESULTS");
  console.log("=".repeat(50));
  console.log(`✅ Successfully booked: ${allSuccessful.length} slots`);
  console.log(`❌ Failed: ${allFailed.length}`);
  console.log(`⏸️ Unavailable: ${allUnavailable.length}`);

  if (allSuccessful.length > 0) {
    console.log("\n🎉 Successfully booked:");
    allSuccessful.forEach(r => console.log(`   • ${r.slot.toString()} (${r.email})`));
  }

  if (allFailed.length > 0) {
    console.log("\n❌ Failed to book:");
    allFailed.forEach(r => console.log(`   • ${r.slot.toString()} (${r.error})`));
  }

  if (allUnavailable.length > 0) {
    console.log("\n⏸️ Were unavailable:");
    allUnavailable.forEach(u => console.log(`   • ${u.slot.toString()} (${u.reason})`));
  }

  process.exit(allSuccessful.length > 0 ? 0 : 1);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('reserve.mjs')) {
  main().catch(error => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}