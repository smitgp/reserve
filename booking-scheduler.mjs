#!/usr/bin/env node
// Intelligent Booking Scheduler
// Checks booking-config.json and executes bookings when their time arrives

import fs from 'fs/promises';
import { execSync } from 'child_process';

// Get today's date in Netherlands timezone
function getTodayNL() {
  const today = new Date();
  const nlTime = new Date(today.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
  return nlTime.toISOString().split('T')[0];
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
    const configFile = await fs.readFile('booking-config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    console.log(`📋 Loaded ${config.bookings.length} booking configurations`);
    
    // Find bookings scheduled for today
    const todaysBookings = config.bookings.filter(booking => {
      return booking.enabled && booking.bookingDate === today;
    });
    
    if (todaysBookings.length === 0) {
      console.log(`🌙 No bookings scheduled for today (${today})`);
      return;
    }
    
    console.log(`🎯 Found ${todaysBookings.length} booking(s) to execute today:`);
    
    for (const booking of todaysBookings) {
      console.log(`\n⭐ Executing: ${booking.description}`);
      console.log(`   Target Date: ${booking.targetDate}`);
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
        
        // Mark as completed by disabling it
        booking.enabled = false;
        booking.completedAt = new Date().toISOString();
        
      } catch (error) {
        console.log(`   ❌ Booking failed: ${error.message}`);
        
        // Add failure info but keep enabled for retry
        booking.lastFailure = {
          at: new Date().toISOString(),
          error: error.message
        };
      }
    }
    
    // Save updated configuration
    if (!dryRun) {
      await fs.writeFile('booking-config.json', JSON.stringify(config, null, 2));
      console.log(`\n💾 Updated booking configuration`);
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