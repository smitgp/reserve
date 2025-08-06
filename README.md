# 🎯 Smart Library Booking Scheduler

**The ultimate hands-off library booking system! Schedule bookings entirely through GitHub's web interface - no local git operations required!**

## ✨ The Perfect Solution

You want to reserve library room 565 for **2025-12-15 from 09:00-17:00**. Instead of:
- ❌ Setting alarms for 2025-12-13 at 18:01
- ❌ Touching your local repository
- ❌ Manual git commits and pushes
- ❌ Manual booking when slots open

You can now:
- ✅ **Schedule from anywhere** via GitHub web interface
- ✅ **Mobile friendly** - book from your phone
- ✅ **Zero local operations** - everything in the cloud
- ✅ **Perfect timing** - automatic execution at 18:01

## 🚀 Quick Start (Zero Local Setup!)

### 1. Schedule Your First Booking

1. **Go to your GitHub repository** → **Actions** tab
2. **Click "📝 Add New Booking"** → **Run workflow**
3. **Fill the form:**
   - Target date: `2025-12-15`
   - Start time: `09:00`
   - End time: `17:00`
   - Description: `Christmas prep day`
4. **Click "Run workflow"** ✅

**That's it!** GitHub will:
- ⏰ Wait until **2025-12-13 at 18:01** Netherlands time
- 🎯 Automatically book **2025-12-15 09:00-17:00** on resource **565**
- ✅ Update status and commit results back to repository

### 2. View Your Bookings

1. **Actions** → **📋 List All Bookings** → **Run workflow**
2. Check the workflow output to see:

```
📋 UPCOMING BOOKINGS

🟢 ACTIVE BOOKINGS:

1. Christmas prep day
   🎯 Target: Mon, Dec 15, 2025 (132 days)
   ⏰ Time: 09:00 - 17:00 (Resource 565)
   📅 Books on: Sat, Dec 13, 2025 at 18:01

📊 SUMMARY:
   🟢 Active: 1
   📊 Total: 1
```

### 3. Manage Your Bookings

- **🗑️ Remove Booking**: Actions → **🗑️ Remove Booking** → Enter date → Run
- **🎛️ All-in-One**: Actions → **🎛️ Manage All Bookings** → Pick action → Run

## 🎛️ Available Workflows

### Core Workflows

1. **📝 Add New Booking**
   - Add bookings via simple form
   - Auto-calculates execution timing
   - Prevents duplicates

2. **📋 List All Bookings** 
   - View all current bookings
   - See status, timing, descriptions
   - Filter upcoming vs all

3. **🗑️ Remove Booking**
   - Remove specific bookings
   - Enable/disable bookings
   - Choose action type

4. **🎛️ Manage All Bookings**
   - One workflow for everything
   - List, add, remove, enable, disable
   - Bulk cleanup operations

5. **⏰ Library Booking Scheduler**
   - Runs automatically daily at 18:01
   - Executes scheduled bookings
   - Updates status back to repository

## 📱 Mobile-Friendly Booking

Perfect for booking on-the-go:

1. **Open GitHub app** or mobile browser
2. **Navigate to** your repository → Actions
3. **Tap "📝 Add New Booking"**
4. **Fill form** and tap "Run workflow"
5. **Done!** Booking scheduled from your phone

## 🎯 Real-World Workflows

### Weekly Work Sessions
```
1. Actions → "📝 Add New Booking"
2. Date: 2025-12-06, Time: 09:00-17:00, Desc: "Friday Focus #1"
3. Date: 2025-12-13, Time: 09:00-17:00, Desc: "Friday Focus #2"
4. Date: 2025-12-20, Time: 09:00-17:00, Desc: "Friday Focus #3"
```

### Project Deadlines
```
1. Actions → "📝 Add New Booking"
2. Date: 2025-11-28, Time: 09:00-18:00, Desc: "Crunch Day 1"
3. Date: 2025-11-29, Time: 09:00-18:00, Desc: "Crunch Day 2"
4. Date: 2025-11-30, Time: 09:00-15:00, Desc: "Final Push"
```

### Conference Prep
```
1. Actions → "📝 Add New Booking"
2. Date: 2026-03-10, Time: 10:00-16:00, Desc: "Presentation Prep"
3. Date: 2026-03-15, Time: 09:00-12:00, Desc: "Final Rehearsal"
```

## 🎮 Workflow Reference

### 📝 Add New Booking
**Purpose**: Schedule new library bookings  
**Inputs**:
- `target_date` (required): YYYY-MM-DD format
- `start_time` (required): HH:MM format
- `end_time` (required): HH:MM format
- `resource` (optional): Default 565
- `description` (optional): Booking description
- `replace_existing` (optional): Overwrite existing booking

### 📋 List All Bookings
**Purpose**: View current booking status  
**Inputs**:
- `show_all` (optional): Include past/completed bookings

**Output**: Organized list of all bookings by status

### 🗑️ Remove Booking
**Purpose**: Manage individual bookings  
**Inputs**:
- `target_date` (required): Date of booking to manage
- `action_type` (required): `remove`, `disable`, or `enable`

### 🎛️ Manage All Bookings
**Purpose**: One-stop booking management  
**Inputs**:
- `action` (required): Choose from:
  - `list-all`: Show all bookings
  - `list-upcoming`: Show upcoming only
  - `add-booking`: Add new booking
  - `remove-booking`: Remove specific booking
  - `disable-booking`: Disable specific booking
  - `enable-booking`: Enable specific booking
  - `clear-all-disabled`: Remove all disabled
  - `clear-all-completed`: Remove all completed
- Plus booking details for add/remove actions

## 🤖 How the Magic Works

### The Complete Flow
```
1. 🖱️  You: GitHub Actions → "Add New Booking" → Fill form
2. 🤖 GitHub: Automatically calculates booking date (target - 2 days)
3. 💾 GitHub: Commits booking to repository configuration
4. ⏰ GitHub: Daily scheduler runs at 18:01 Netherlands time
5. 🎯 GitHub: On booking date, executes reservation automatically
6. ✅ GitHub: Updates booking status and commits back
7. 🎉 You: Library slot reserved perfectly!
```

### Technical Details

- **Configuration**: All bookings stored in `booking-config.json`
- **Execution**: Daily cron job at `1 17 * * *` (18:01 Netherlands time)
- **Updates**: Status changes automatically committed back
- **Reliability**: GitHub's infrastructure ensures perfect timing
- **Mobile**: Works seamlessly on mobile GitHub

## 🔧 GitHub Actions Setup

### Required Repository Secrets

Set these in **Settings** → **Secrets and Variables** → **Actions**:

```
EMAIL=your-library-email@domain.com
LOCATION=41
TYPE=36
BASE_EMAIL=your-gmail@gmail.com
ENGINE_BODY=your-form-data
```

### Permissions

Ensure your repository has:
- **Read and write permissions** for Actions
- **Allow GitHub Actions to create and approve pull requests** (for commits)

## 📊 Booking Status Tracking

The system automatically tracks:

- **🟢 Active**: Enabled, waiting for execution
- **✅ Completed**: Successfully booked
- **❌ Failed**: Booking attempt failed (will retry)
- **🔴 Disabled**: Manually disabled
- **📅 Execution Date**: When booking will run
- **👤 Added By**: Who/what added the booking
- **🕐 Timestamps**: All status changes

## 🎉 Why This System is Revolutionary

### ❌ Old Problems
- Manual alarm setting for 18:01
- Local git operations required
- One-off booking attempts
- No status tracking
- Desktop-only management

### ✅ New Solutions
- **🌐 Web-based**: Manage from anywhere
- **📱 Mobile-ready**: Book from your phone
- **🤖 Automatic**: Perfect timing every time
- **📊 Tracked**: Full status visibility
- **🔄 Reliable**: GitHub's infrastructure
- **📈 Scalable**: Handle unlimited bookings

## 🚨 Important Notes

- **Timing**: Bookings execute at 18:01 Netherlands time (when slots open at 18:00)
- **Advance**: Always books exactly 2 days in advance
- **Resource**: Defaults to room 565 unless specified
- **Status**: Auto-updates after execution
- **History**: All changes tracked in git history
- **Mobile**: Fully functional on mobile devices

## 🎮 Pro Tips

### Quick Actions
1. **Bookmark** your repository's Actions page
2. **Pin workflows** you use frequently
3. **Use descriptive names** for easy identification
4. **Check status** via "List Bookings" workflow

### Bulk Operations
- Use **"Manage All Bookings"** for bulk cleanup
- **Clear completed** bookings periodically
- **Disable** bookings instead of removing (easier to re-enable)

### Mobile Optimization
- **GitHub mobile app** provides best experience
- **Mobile browser** works perfectly too
- **Bookmark** Actions page for quick access

---

**🎉 Happy Booking!** You now have the most advanced, hands-off library booking system that works from anywhere, anytime! 🌍📱✨

**Never miss a booking slot again!** 🎯