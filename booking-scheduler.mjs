#!/usr/bin/env node
// Intelligent Booking Scheduler for YAML Configuration
// Checks bookings.yml and executes bookings when their time arrives

import fs from 'fs/promises';
import { execSync } from 'child_process';
import YAML from 'yaml';

// Get today's date in Netherlands timezone
function getTodayNL() {
  const today = new Date();
  const nlTime = new Date(today.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
  return nlTime.toISOString().split('T')[0];
}

// Calculate booking date (2 days before target date)
function calculateBookingDate(targetDate) {
  const target = new Date(targetDate + 'T00:00:00Z');
  const booking = new Date(target);
  booking.setDate(booking.getDate() - 2);
  return booking.toISOString().split('T')[0];
}

async function main() {
  const forceDate = process.env.FORCE_DATE;
  const dryRun = process.env.DRY_RUN === 'true';
  const today = forceDate || getTodayNL();
  
  console.log(`📅 Today: ${today}`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'LIVE BOOKING'}`);
  console.log(`⚡ Force date: ${forceDate || 'none'}`);
  
  try {
    // Load booking configuration
    const yamlContent = await fs.readFile('bookings.yml', 'utf8');
    const config = YAML.parse(yamlContent);
    
    if (!config.bookings || !Array.isArray(config.bookings)) {
      console.log(`📭 No bookings found in configuration`);
      return;
    }
    
    console.log(`📋 Loaded ${config.bookings.length} booking configurations`);
    
    // Find bookings scheduled for today
    const todaysBookings = config.bookings.filter(booking => {
      const bookingDate = calculateBookingDate(booking.targetDate);
      return bookingDate === today;
    });
    
    if (todaysBookings.length === 0) {
      console.log(`🌙 No bookings scheduled for today (${today})`);
      return;
    }
    
    console.log(`🎯 Found ${todaysBookings.length} booking(s) to execute today:`);
    
    for (const booking of todaysBookings) {
      console.log(`\n⭐ Executing booking for ${booking.targetDate}`);
      console.log(`   Time: ${booking.start} - ${booking.end}`);
      console.log(`   Resource: ${booking.resource}`);
      
      if (dryRun) {
        console.log(`   🧪 DRY RUN: Would execute booking now`);
        continue;
      }
      
      try {
        // Execute the booking
        const command = `node reserve.mjs --date "${booking.targetDate}" --start "${booking.start}" --end "${booking.end}" --resource "${booking.resource}"`;
        console.log(`   🚀 Executing: ${command}`);
        
        const output = execSync(command, { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        console.log(`   ✅ Booking completed successfully`);
        console.log(`   📄 Output: ${output.trim()}`);
        
        // Remove completed booking from YAML
        const index = config.bookings.indexOf(booking);
        if (index > -1) {
          config.bookings.splice(index, 1);
          console.log(`   🗑️ Removed completed booking from schedule`);
        }
        
      } catch (error) {
        console.log(`   ❌ Booking failed: ${error.message}`);
        // Keep failed bookings in the list for potential retry
      }
    }
    
    // Save updated configuration (removes completed bookings)
    if (!dryRun) {
      const updatedYaml = YAML.stringify(config, {
        lineWidth: 0,
        minContentWidth: 0
      });
      await fs.writeFile('bookings.yml', updatedYaml);
      console.log(`\n💾 Updated bookings.yml`);
    }
    
  } catch (error) {
    console.error(`❌ Scheduler error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('booking-scheduler.mjs')) {
  main().catch(error => {
    console.error("Fatal scheduler error:", error.message);
    process.exit(1);
  });
}