#!/usr/bin/env node
// Helper script to add new bookings to the configuration

import fs from 'fs/promises';
import { parseArgs } from 'util';

function calculateBookingDate(targetDate) {
  const target = new Date(targetDate + 'T00:00:00Z');
  const booking = new Date(target);
  booking.setDate(booking.getDate() - 2); // 2 days before
  return booking.toISOString().split('T')[0];
}

async function main() {
  const args = parseArgs({
    options: {
      date: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      resource: { type: "string", default: "565" },
      description: { type: "string" },
      help: { type: "boolean" }
    }
  });

  if (args.values.help || !args.values.date || !args.values.start || !args.values.end) {
    console.log(`
Add Booking Helper

Usage:
  node add-booking.mjs --date 2025-12-15 --start 09:00 --end 17:00 --description "Full day work session"

Options:
  --date YYYY-MM-DD         Target booking date
  --start HH:MM            Start time
  --end HH:MM              End time  
  --resource NUM           Resource ID (default: 565)
  --description TEXT       Booking description
  --help                   Show this help

Examples:
  node add-booking.mjs --date 2025-12-15 --start 09:00 --end 17:00 --description "Christmas prep day"
  node add-booking.mjs --date 2025-12-20 --start 10:00 --end 16:00 --description "Pre-holiday work"
`);
    process.exit(args.values.help ? 0 : 1);
  }

  const { date, start, end, resource, description } = args.values;
  const bookingDate = calculateBookingDate(date);
  
  console.log(`📅 Target Date: ${date}`);
  console.log(`⏰ Booking Window: ${bookingDate} at 18:01 Netherlands time`);
  console.log(`🕐 Time Slot: ${start} - ${end}`);
  console.log(`🏢 Resource: ${resource}`);
  
  try {
    // Load existing configuration
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    // Create new booking
    const newBooking = {
      id: `booking-${date}`,
      targetDate: date,
      bookingDate: bookingDate,
      start: start,
      end: end,
      resource: resource,
      description: description || `Booking for ${date}`,
      enabled: true,
      addedAt: new Date().toISOString()
    };
    
    // Check for duplicates
    const existing = config.bookings.find(b => b.targetDate === date);
    if (existing) {
      console.log(`⚠️  Booking for ${date} already exists:`);
      console.log(`   Current: ${existing.start}-${existing.end} (${existing.enabled ? 'enabled' : 'disabled'})`);
      console.log(`   New: ${start}-${end}`);
      
      const replace = process.argv.includes('--replace');
      if (!replace) {
        console.log(`\n❌ Use --replace flag to overwrite existing booking`);
        process.exit(1);
      }
      
      // Remove existing
      config.bookings = config.bookings.filter(b => b.targetDate !== date);
      console.log(`🔄 Replaced existing booking`);
    }
    
    // Add new booking
    config.bookings.push(newBooking);
    config.bookings.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
    
    // Save configuration
    await fs.writeFile('booking-config.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Added booking successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   • The scheduler will run every day at 18:01 Netherlands time`);
    console.log(`   • On ${bookingDate}, it will attempt to book ${date} ${start}-${end}`);
    console.log(`   • Resource ${resource} will be reserved`);
    console.log(`\n🚀 Your booking is now scheduled and will execute automatically!`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('add-booking.mjs')) {
  main().catch(error => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}