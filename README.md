# 🎯 Smart Library Booking Scheduler

**The ultimate hands-off library booking system! Simple YAML configuration with automatic resource selection - no room IDs needed!**

## ✨ The Perfect Solution

You want to reserve a library room for **2026-02-20 from 09:00-17:00**. Instead of:
- ❌ Manually checking which rooms are free
- ❌ Setting alarms for 18:01 to catch new slots
- ❌ Managing complex configuration files

You can now:
- ✅ **Simple YAML config** without needing to know resource IDs
- ✅ **Auto-selection**: The system finds the best available room for you
- ✅ **Prioritized Booking**: Prefers room 563, then falls back to others
- ✅ **Intelligent Chunks**: If no room is free all day, it books the best available chunks (max 3h each)

## 🚀 Quick Start

### 1. Add Your First Booking

1. **Go to** GitHub → Your Repository → **Actions**
2. **Click** "📝 Add New Booking" → **Run workflow**
3. **Fill the form:**
   - Target date: `2026-02-20`
   - Start time: `09:00`
   - End time: `17:00`
4. **Click** "Run workflow" ✅

### 2. View Your Schedule

**Bookmark** your `bookings.yml` file in your browser! It looks like this:

```yaml
# Library Booking Schedule
# Each booking executes 2 days before target date at 18:01 Netherlands time

bookings:
  - targetDate: "2026-02-20"
    start: "09:00"
    end: "17:00"
```

**Clean, simple, human-readable!** 📖

### 3. Remove Bookings

1. **Actions** → **🗑️ Remove Booking(s)** → **Run workflow**
2. **Options:**
   - **Specific date**: Enter `2026-02-20` to remove that booking
   - **Remove all**: Leave date empty to clear entire schedule

## 📋 Available Workflows

### Core Operations

1. **📝 Add New Booking**
   - Simple form input (Date, Start, End)
   - Updates YAML automatically

2. **🗑️ Remove Booking(s)**
   - Remove specific booking by date
   - Remove ALL bookings (leave date empty)

3. **⏰ Library Booking Scheduler** *(Automatic)*
   - Runs daily at 18:01 Netherlands time
   - **Strategy 1**: Finds a single room available for your entire duration
   - **Strategy 2**: If no single room is free, it books chunks across available rooms
   - Removes completed bookings from YAML

## 🎯 YAML Configuration

### Simple Structure
```yaml
bookings:
  - targetDate: "YYYY-MM-DD"    # When you want a room
    start: "HH:MM"              # Start time
    end: "HH:MM"                # End time  
```

## 🤖 How It Works

### The Timeline
```
Today: 2026-02-18
   ↓
   📝 You add: 2026-02-20 booking via workflow
   ↓
   ⏰ 2026-02-18 at 18:01: Auto-execution
   ↓
   🔍 System checks availability for all preferred rooms
   ↓
   ✅ Room found and reserved!
   ↓
   🧹 Booking removed from YAML (completed)
```

### Perfect Timing
- **Execution**: 2 days before target date at 18:01 Netherlands time
- **Why**: Library slots open exactly at 18:00, we book immediately after.

## 📱 Mobile-Friendly Workflow

1. **GitHub mobile app** or browser
2. **Navigate** to repository → Actions
3. **Tap** "📝 Add New Booking"
4. **Fill form** and tap "Run workflow"

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

---

**🎉 Happy Booking!** The simplest, most elegant library booking system ever created! 🌟
