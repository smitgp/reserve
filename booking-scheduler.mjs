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

// Get current Netherlands time
function getCurrentNLTime() {
  const now = new Date();
  const nlTimeString = now.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"});
  return new Date(nlTimeString);
}

// Check if we're in the critical booking window (around 19:00)
function isCriticalBookingWindow() {
  const nlTime = getCurrentNLTime();
  const hour = nlTime.getHours();
  const minute = nlTime.getMinutes();
  
  // Critical window: 18:55 to 19:05 (10 minute window)
  if (hour === 18 && minute >= 55) return true;
  if (hour === 19 && minute <= 5) return true;
  
  return false;
}

// Check if we should book today based on target date
function shouldBookToday(targetDate, today) {
  const target = new Date(targetDate + 'T00:00:00Z');
  const todayDate = new Date(today + 'T00:00:00Z');
  
  // Calculate days until target
  const daysUntilTarget = Math.ceil((target - todayDate) / (1000 * 60 * 60 * 24));
  
  console.log(`   📊 Days until ${targetDate}: ${daysUntilTarget}`);
  
  // Book if target is today (0), tomorrow (1), or day after tomorrow (2)
  if (daysUntilTarget >= 0 && daysUntilTarget <= 2) {
    console.log(`   ✅ Target is within booking window - attempting booking today`);
    return true;
  }
  
  console.log(`   ⏭️ Target is too far away - skipping for now`);
  return false;
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
    
    // Find bookings that should be attempted today
    const todaysBookings = config.bookings.filter(booking => {
      console.log(`\n🔍 Checking booking for ${booking.targetDate}:`);
      return shouldBookToday(booking.targetDate, today);
    });
    
    if (todaysBookings.length === 0) {
      console.log(`🌙 No bookings scheduled for today (${today})`);
      return;
    }
    
    console.log(`🎯 Found ${todaysBookings.length} booking(s) to execute today:`);
    
    const isCriticalWindow = isCriticalBookingWindow();
    const nlTime = getCurrentNLTime();
    console.log(`🕐 Current Netherlands time: ${nlTime.toLocaleTimeString('en-US', {timeZone: 'Europe/Amsterdam'})}`);
    console.log(`🎯 Critical booking window: ${isCriticalWindow ? 'YES - will retry every 10s' : 'NO - single attempt'}`);
    
    for (const booking of todaysBookings) {
      console.log(`\n⭐ Executing booking for ${booking.targetDate}`);
      console.log(`   Time: ${booking.start} - ${booking.end}`);
      console.log(`   Resource: ${booking.resource}`);
      
      if (dryRun) {
        console.log(`   🧪 DRY RUN: Would execute booking now`);
        continue;
      }
      
      // During critical window: retry every 10 seconds for 3 minutes (18 attempts)
      // Outside critical window: try 3 times with 10 second delays
      const maxAttempts = isCriticalWindow ? 18 : 3;
      const delayBetweenAttempts = 10000; // 10 seconds
      const maxDuration = isCriticalWindow ? 180000 : null; // 3 minutes for critical window
      let success = false;
      let attempt = 0;
      const startTime = Date.now();
      
      while (!success && attempt < maxAttempts) {
        attempt++;
        const elapsed = Date.now() - startTime;
        
        // Stop if we've exceeded max duration in critical window
        if (maxDuration && elapsed >= maxDuration) {
          console.log(`   ⏰ Reached maximum duration (${maxDuration/1000}s) - stopping retries`);
          break;
        }
        
        // Check if we're still in critical window (if we started in it)
        if (isCriticalWindow && !isCriticalBookingWindow() && attempt > 1) {
          console.log(`   ⏰ Exited critical booking window - stopping retries`);
          break;
        }
        
        try {
          const nlTimeNow = getCurrentNLTime();
          console.log(`   🚀 Attempt ${attempt} at ${nlTimeNow.toLocaleTimeString('en-US', {timeZone: 'Europe/Amsterdam'})}`);
          
          // Execute the booking
          const command = `node reserve.mjs --date "${booking.targetDate}" --start "${booking.start}" --end "${booking.end}" --resource "${booking.resource}"`;
          console.log(`   📞 Executing: ${command}`);
          
          const output = execSync(command, { 
            encoding: 'utf8',
            stdio: 'pipe'
          });
          
          console.log(`   ✅ Booking completed successfully on attempt ${attempt}`);
          console.log(`   📄 Output: ${output.trim()}`);
          
          // Remove completed booking from YAML
          const index = config.bookings.indexOf(booking);
          if (index > -1) {
            config.bookings.splice(index, 1);
            console.log(`   🗑️ Removed completed booking from schedule`);
          }
          
          success = true;
          
        } catch (error) {
          console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
          
          if (attempt < maxAttempts && (isCriticalWindow || attempt < 3)) {
            console.log(`   ⏳ Waiting ${delayBetweenAttempts/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
          } else {
            console.log(`   💥 Stopping retries - keeping booking for next run`);
          }
        }
      }
      
      if (!success) {
        console.log(`   ⚠️ Booking not completed after ${attempt} attempts`);
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