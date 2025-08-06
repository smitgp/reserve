#!/usr/bin/env node
// Booking management utility

import fs from 'fs/promises';
import { parseArgs } from 'util';

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

async function listBookings(showAll = false) {
  try {
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    let bookings = config.bookings;
    
    if (!showAll) {
      // Filter to show only upcoming bookings
      const today = new Date().toISOString().split('T')[0];
      bookings = bookings.filter(b => b.targetDate >= today);
    }
    
    if (bookings.length === 0) {
      console.log('📭 No bookings found');
      return;
    }
    
    console.log(`📋 ${showAll ? 'All' : 'Upcoming'} Bookings (${bookings.length}):\n`);
    
    bookings.forEach((booking, index) => {
      const days = daysUntil(booking.targetDate);
      const status = booking.enabled ? '🟢 Active' : '🔴 Disabled';
      const completed = booking.completedAt ? '✅ Completed' : '';
      const failed = booking.lastFailure ? '❌ Failed' : '';
      
      console.log(`${index + 1}. ${status} ${booking.description}`);
      console.log(`   📅 Target: ${formatDate(booking.targetDate)} (${days > 0 ? `${days} days` : days === 0 ? 'today' : `${Math.abs(days)} days ago`})`);
      console.log(`   ⏰ Time: ${booking.start} - ${booking.end} (Resource ${booking.resource})`);
      console.log(`   🕐 Books on: ${formatDate(booking.bookingDate)} at 18:01`);
      
      if (completed) {
        console.log(`   ${completed} at ${new Date(booking.completedAt).toLocaleString()}`);
      }
      
      if (failed) {
        console.log(`   ${failed} ${booking.lastFailure.error}`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error(`❌ Error reading bookings: ${error.message}`);
  }
}

async function enableBooking(targetDate) {
  try {
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    const booking = config.bookings.find(b => b.targetDate === targetDate);
    if (!booking) {
      console.log(`❌ No booking found for ${targetDate}`);
      return;
    }
    
    booking.enabled = true;
    delete booking.completedAt;
    
    await fs.writeFile('booking-config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Enabled booking for ${targetDate}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function disableBooking(targetDate) {
  try {
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    const booking = config.bookings.find(b => b.targetDate === targetDate);
    if (!booking) {
      console.log(`❌ No booking found for ${targetDate}`);
      return;
    }
    
    booking.enabled = false;
    
    await fs.writeFile('booking-config.json', JSON.stringify(config, null, 2));
    console.log(`🔴 Disabled booking for ${targetDate}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function removeBooking(targetDate) {
  try {
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    const initialLength = config.bookings.length;
    config.bookings = config.bookings.filter(b => b.targetDate !== targetDate);
    
    if (config.bookings.length === initialLength) {
      console.log(`❌ No booking found for ${targetDate}`);
      return;
    }
    
    await fs.writeFile('booking-config.json', JSON.stringify(config, null, 2));
    console.log(`🗑️ Removed booking for ${targetDate}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs({
    options: {
      list: { type: "boolean" },
      all: { type: "boolean" },
      enable: { type: "string" },
      disable: { type: "string" },
      remove: { type: "string" },
      help: { type: "boolean" }
    }
  });

  if (args.values.help) {
    console.log(`
Booking Management Utility

Usage:
  node manage-bookings.mjs [options]

Options:
  --list              List upcoming bookings
  --all               Show all bookings (including past)
  --enable DATE       Enable booking for date (YYYY-MM-DD)
  --disable DATE      Disable booking for date (YYYY-MM-DD)
  --remove DATE       Remove booking for date (YYYY-MM-DD)
  --help              Show this help

Examples:
  node manage-bookings.mjs --list
  node manage-bookings.mjs --all
  node manage-bookings.mjs --enable 2025-12-15
  node manage-bookings.mjs --disable 2025-12-15
  node manage-bookings.mjs --remove 2025-12-15
`);
    return;
  }

  if (args.values.enable) {
    await enableBooking(args.values.enable);
  } else if (args.values.disable) {
    await disableBooking(args.values.disable);
  } else if (args.values.remove) {
    await removeBooking(args.values.remove);
  } else {
    // Default to listing bookings
    await listBookings(args.values.all);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('manage-bookings.mjs')) {
  main().catch(error => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}