# Library Reservation Tool

Simple, lightweight tool to book library workspace reservations.

## Usage

```bash
# Install dependencies
npm install

# Book a specific time slot
node reserve.mjs --date 2025-08-07 --start 10:00 --end 13:00 --resource 565

# Book a full work day (automatically split into 3-hour chunks)
node reserve.mjs --date 2025-08-07 --start 09:00 --end 18:00 --resource 565

# Using npm script
npm run reserve -- --date 2025-08-07 --start 09:00 --end 18:00 --resource 565
```

## What it does

1. **Splits long periods** into 3-hour chunks (library requirement)
2. **Checks availability** before attempting bookings
3. **Creates multiple guest accounts** as needed (max 2 reservations per account)
4. **Books all available slots** in one run
5. **Reports clear results** - success or failure

## Options

- `--date YYYY-MM-DD` - Target date (only today/tomorrow work)
- `--start HH:MM` - Start time
- `--end HH:MM` - End time  
- `--resource NUM` - Resource ID (e.g., 565)

## Example Output

```
🎯 Attempting to reserve 2025-08-07 07:00-16:00 on Resource 565
📋 Split into 3 chunks:
   • 2025-08-07 07:00-10:00 (Resource 565)
   • 2025-08-07 10:00-13:00 (Resource 565)
   • 2025-08-07 13:00-16:00 (Resource 565)

🔍 Checking availability...
✅ Available: 2025-08-07 07:00-10:00 (Resource 565)
✅ Available: 2025-08-07 10:00-13:00 (Resource 565)
✅ Available: 2025-08-07 13:00-16:00 (Resource 565)

📅 Attempting to book 3 available slots...
👥 Need 2 guest account(s) for 3 slots

🆔 Guest account 1/2 (2 reservations):
⏳ Creating guest account...
✅ Created account: g.smit92+pmrkm6@gmail.com
⏳ Booking: 2025-08-07 07:00-10:00 (Resource 565)
✅ Success: 2025-08-07 07:00-10:00 (Resource 565)
⏳ Booking: 2025-08-07 10:00-13:00 (Resource 565)
✅ Success: 2025-08-07 10:00-13:00 (Resource 565)

🆔 Guest account 2/2 (1 reservations):
⏳ Creating guest account...
✅ Created account: g.smit92+7vkgko@gmail.com
⏳ Booking: 2025-08-07 13:00-16:00 (Resource 565)
✅ Success: 2025-08-07 13:00-16:00 (Resource 565)

📊 FINAL RESULTS
✅ Successfully booked: 3/3 slots
🎉 Successfully booked:
   • 2025-08-07 07:00-10:00 (Resource 565) (g.smit92+pmrkm6@gmail.com)
   • 2025-08-07 10:00-13:00 (Resource 565) (g.smit92+pmrkm6@gmail.com)
   • 2025-08-07 13:00-16:00 (Resource 565) (g.smit92+7vkgko@gmail.com)
```

## Files

- `reserve.mjs` - Main reservation tool
- `reserve_guest.mjs` - Original guest reservation script (backup)
- `.env` - Configuration (email, location, etc.)

## Automated Scheduling

Set up GitHub Actions to run automatically while your laptop is off!

```bash
# See GITHUB_ACTIONS_SETUP.md for full instructions
# 1. Push to GitHub
# 2. Add secrets in repo settings  
# 3. Enjoy automated daily bookings!
```

- ⏰ **Daily at 6 AM UTC** - automatically books tomorrow's slots
- 🎯 **Manual trigger** - book specific dates on-demand  
- 📊 **Full logging** - see exactly what happened
- 🔒 **Secure** - credentials stored as GitHub secrets

Simple and focused! 🎯