#!/usr/bin/env node
// Intelligent Booking Scheduler for YAML Configuration
// Checks bookings.yml and executes bookings when their time arrives

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';

const execAsync = promisify(exec);

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

// Check if we're in the critical booking window (around 18:00)
function isCriticalBookingWindow() {
  const nlTime = getCurrentNLTime();
  const hour = nlTime.getHours();
  const minute = nlTime.getMinutes();
  
  // Critical window: 17:55 to 18:05 (10 minute window)
  if (hour === 17 && minute >= 55) return true;
  if (hour === 18 && minute <= 5) return true;
  
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
    // SPECIAL CASE: T+2 bookings only open at 18:00
    if (daysUntilTarget === 2) {
      const nlTime = getCurrentNLTime();
      const hour = nlTime.getHours();
      const minute = nlTime.getMinutes();
      
      // If before 17:55, it's too early for T+2
      if (hour < 17 || (hour === 17 && minute < 55)) {
        console.log(`   ⏭️ Target is 2 days away but it's not yet 18:00 - skipping until evening run`);
        return false;
      }
      console.log(`   🎯 Target is 2 days away and we are in the 18:00 window - proceeding`);
    } else {
      console.log(`   ✅ Target is within booking window - attempting booking today`);
    }
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
    
    // Execute all bookings for today in parallel
    const bookingPromises = todaysBookings.map(async (booking) => {
      console.log(`\n⭐ Starting booking for ${booking.targetDate} (${booking.start} - ${booking.end})`);
      
      if (dryRun) {
        console.log(`   🧪 DRY RUN: Would execute booking for ${booking.targetDate} now`);
        return true;
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
          console.log(`   ⏰ [${booking.targetDate}] Reached maximum duration (${maxDuration/1000}s) - stopping retries`);
          break;
        }
        
        // Check if we're still in critical window (if we started in it)
        if (isCriticalWindow && !isCriticalBookingWindow() && attempt > 1) {
          console.log(`   ⏰ [${booking.targetDate}] Exited critical booking window - stopping retries`);
          break;
        }
        
        try {
          const nlTimeNow = getCurrentNLTime();
          console.log(`   🚀 [${booking.targetDate}] Attempt ${attempt} at ${nlTimeNow.toLocaleTimeString('en-US', {timeZone: 'Europe/Amsterdam'})}`);
          
          // Execute the booking
          const command = `node reserve.mjs --date "${booking.targetDate}" --start "${booking.start}" --end "${booking.end}"`;
          console.log(`   📞 [${booking.targetDate}] Executing: ${command}`);
          
          const { stdout } = await execAsync(command);
          
          console.log(`   ✅ [${booking.targetDate}] Booking completed successfully on attempt ${attempt}`);
          console.log(`   📄 [${booking.targetDate}] Output: ${stdout.trim()}`);
          
          // Remove completed booking from memory config
          const index = config.bookings.indexOf(booking);
          if (index > -1) {
            config.bookings.splice(index, 1);
            console.log(`   🗑️ [${booking.targetDate}] Removed completed booking from memory schedule`);
          }
          
          success = true;
          
        } catch (error) {
          console.log(`   ❌ [${booking.targetDate}] Attempt ${attempt} failed: ${error.message}`);
          if (error.stdout) console.log(`   📄 [${booking.targetDate}] Output: ${error.stdout.trim()}`);
          if (error.stderr) console.log(`   ⚠️ [${booking.targetDate}] Error Output: ${error.stderr.trim()}`);
          
          if (attempt < maxAttempts && (isCriticalWindow || attempt < 3)) {
            console.log(`   ⏳ [${booking.targetDate}] Waiting ${delayBetweenAttempts/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
          } else {
            console.log(`   💥 [${booking.targetDate}] Stopping retries - keeping booking for next run`);
          }
        }
      }
      
      if (!success) {
        console.log(`   ⚠️ [${booking.targetDate}] Booking not completed after ${attempt} attempts`);
      }
      return success;
    });

    // Wait for all bookings to finish
    await Promise.all(bookingPromises);
    
    // Save updated configuration (removes completed bookings and cleans up past ones)
    if (!dryRun) {
      const initialCount = config.bookings.length;
      config.bookings = config.bookings.filter(booking => booking.targetDate >= today);
      const cleanedCount = initialCount - config.bookings.length;
      if (cleanedCount > 0) {
        console.log(`🧹 Removed ${cleanedCount} past booking(s) from schedule`);
      }

      const yamlData = YAML.stringify(config, {
        lineWidth: 0,
        minContentWidth: 0,
        quotingType: '"'
      });
      
      let headerComment = '# Library Booking Schedule\n';
      headerComment += '# Simple YAML configuration for automatic library bookings\n';
      headerComment += '#\n';
      headerComment += '# Each booking will execute 2 days before the target date at 18:01 Netherlands time\n';
      headerComment += '# Example booking:\n';
      headerComment += '#   - targetDate: 2026-02-25\n';
      headerComment += '#     start: "09:00"\n';
      headerComment += '#     end: "17:00"\n';
      headerComment += '\n';
      
      await fs.writeFile('bookings.yml', headerComment + yamlData);
      console.log(`💾 Updated bookings.yml`);
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