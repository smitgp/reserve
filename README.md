# 🎯 Smart Library Booking Scheduler

**The ultimate hands-off library booking system! Simple YAML configuration with automatic execution - no local git operations required!**

## ✨ The Perfect Solution

You want to reserve library room 565 for **2025-12-15 from 09:00-17:00**. Instead of:
- ❌ Setting alarms for 2025-12-13 at 18:01
- ❌ Manual booking when slots open
- ❌ Complex configuration files

You can now:
- ✅ **Simple YAML config** you can bookmark and view easily
- ✅ **Add bookings** via GitHub web interface
- ✅ **Auto-execution** at perfect timing
- ✅ **Mobile friendly** - manage from anywhere

## 🚀 Quick Start

### 1. Add Your First Booking

1. **Go to** GitHub → Your Repository → **Actions**
2. **Click** "📝 Add New Booking" → **Run workflow**
3. **Fill the form:**
   - Target date: `2025-12-15`
   - Start time: `09:00`
   - End time: `17:00`
   - Resource: `565` (default)
4. **Click** "Run workflow" ✅

### 2. View Your Schedule

**Bookmark** your `bookings.yml` file in your browser! It looks like this:

```yaml
# Library Booking Schedule
# Each booking executes 2 days before target date at 18:01 Netherlands time

bookings:
  - targetDate: "2025-12-15"
    start: "09:00"
    end: "17:00"
    resource: "565"
    
  - targetDate: "2025-12-20"
    start: "10:00"
    end: "16:00"
    resource: "565"
```

**Clean, simple, human-readable!** 📖

### 3. Remove Bookings

1. **Actions** → **🗑️ Remove Booking(s)** → **Run workflow**
2. **Options:**
   - **Specific date**: Enter `2025-12-15` to remove that booking
   - **Remove all**: Leave date empty to clear entire schedule

## 📋 Available Workflows

### Core Operations (Only 2 Workflows!)

1. **📝 Add New Booking**
   - Simple form input
   - Auto-calculates execution timing
   - Updates YAML automatically

2. **🗑️ Remove Booking(s)**
   - Remove specific booking by date
   - Remove ALL bookings (leave date empty)
   - Clean YAML maintenance

3. **⏰ Library Booking Scheduler** *(Automatic)*
   - Runs daily at 18:01 Netherlands time
   - Executes scheduled bookings
   - Removes completed bookings from YAML

## 🎯 YAML Configuration

### Simple Structure
```yaml
bookings:
  - targetDate: "YYYY-MM-DD"    # When you want the room
    start: "HH:MM"              # Start time
    end: "HH:MM"                # End time  
    resource: "565"             # Room number
```

### Key Benefits
- **📖 Human readable** - bookmark in browser
- **🎯 Minimal** - only essential fields
- **📅 Auto-calculated** - booking date inferred (target - 2 days)
- **🧹 Self-cleaning** - completed bookings auto-removed

## 🎮 Real-World Usage

### Weekly Sessions
```yaml
bookings:
  - targetDate: "2025-12-06"
    start: "09:00"
    end: "17:00"
    resource: "565"
    
  - targetDate: "2025-12-13"
    start: "09:00"
    end: "17:00"
    resource: "565"
```

### Project Crunch Time
```yaml
bookings:
  - targetDate: "2025-11-28"
    start: "09:00"
    end: "18:00"
    resource: "565"
    
  - targetDate: "2025-11-29"
    start: "09:00"
    end: "18:00"
    resource: "565"
    
  - targetDate: "2025-11-30"
    start: "09:00"
    end: "15:00"
    resource: "565"
```

## 🤖 How It Works

### The Timeline
```
Today: 2025-08-06
   ↓
   📝 You add: 2025-12-15 booking via workflow
   ↓
   📋 System calculates: Execute on 2025-12-13
   ↓
   ⏰ 2025-12-13 at 18:01: Auto-execution
   ↓
   ✅ 2025-12-15: Room reserved!
   ↓
   🧹 Booking removed from YAML (completed)
```

### Perfect Timing
- **Target**: 2025-12-15 (when you want the room)
- **Execution**: 2025-12-13 at 18:01 Netherlands time
- **Why**: Library slots open exactly at 18:00, we book at 18:01

## 📱 Mobile-Friendly Workflow

1. **GitHub mobile app** or browser
2. **Navigate** to repository → Actions
3. **Tap** "📝 Add New Booking"
4. **Fill form** and tap "Run workflow"
5. **Bookmark** `bookings.yml` for easy viewing

## 🔧 Setup Requirements

### Required Repository Secrets
Set in **Settings** → **Secrets and Variables** → **Actions**:

```
EMAIL=your-library-email@domain.com
LOCATION=41
TYPE=36
BASE_EMAIL=your-gmail@gmail.com
ENGINE_BODY=your-form-data
```

### Dependencies
- **YAML parser** added automatically
- **GitHub Actions** with write permissions
- **Daily cron** schedule configured

## 📊 Workflow Details

### 📝 Add New Booking
**Inputs:**
- `target_date` (required): YYYY-MM-DD
- `start_time` (required): HH:MM
- `end_time` (required): HH:MM  
- `resource` (optional): Default 565

**Process:**
1. Validates inputs
2. Calculates execution date (target - 2 days)
3. Adds to YAML with nice formatting
4. Commits to repository

### 🗑️ Remove Booking(s)
**Inputs:**
- `target_date` (optional): Date to remove, or empty for ALL

**Process:**
1. If date provided: Remove specific booking
2. If empty: Remove ALL bookings
3. Updates YAML with clean formatting
4. Commits changes

### ⏰ Library Booking Scheduler
**Automatic Process:**
1. Runs daily at 18:01 Netherlands time
2. Checks YAML for bookings due today
3. Executes library reservations
4. Removes completed bookings from YAML
5. Commits updated YAML

## 🎉 Why This System is Perfect

### ❌ Old Complexity
- JSON configuration with metadata
- Multiple management workflows
- Complex status tracking
- Hard to read/edit manually

### ✅ New Simplicity
- **📖 YAML** - human readable
- **🎯 2 workflows** - add & remove
- **📱 Mobile friendly**
- **🔗 Bookmarkable** schedule
- **🧹 Self-maintaining**

## 📋 Quick Reference

### Add Booking
```
Actions → "📝 Add New Booking" → Fill form → Run
```

### View Schedule
```
Bookmark: your-repo/blob/main/bookings.yml
```

### Remove Specific Booking
```
Actions → "🗑️ Remove Booking(s)" → Enter date → Run
```

### Clear All Bookings
```
Actions → "🗑️ Remove Booking(s)" → Leave date empty → Run
```

## 🚨 Important Notes

- **Timing**: Executes at 18:01 Netherlands time (perfect timing)
- **Advance**: Always books exactly 2 days in advance
- **Resource**: Defaults to room 565
- **Auto-cleanup**: Completed bookings removed automatically
- **Mobile**: Fully functional on mobile devices
- **Bookmarkable**: YAML file is perfect for browser bookmarks

---

**🎉 Happy Booking!** The simplest, most elegant library booking system ever created! 🌟

**Your `bookings.yml` is now your single source of truth - bookmark it and manage your entire schedule with ease!** 📚✨