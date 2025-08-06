# 📅 How to Schedule Future Bookings

## 🎯 **For Your Specific Case**

**Want to book**: 2025-08-11  
**Schedule for**: 2025-08-09 at 18:01  
**Status**: ✅ Created `.github/workflows/schedule-booking-2025-08-11.yml`

## 🔧 **To Schedule ANY Future Booking**

### **Step 1: Calculate When to Run**
- **Target booking date**: 2025-08-XX
- **Run workflow on**: 2 days before at 18:01
- **Example**: Book 2025-08-15 → Schedule for 2025-08-13 at 18:01

### **Step 2: Create Workflow File**
Copy `.github/workflows/schedule-booking-2025-08-11.yml` and modify:

```yaml
name: Schedule Booking for 2025-08-15

on:
  schedule:
    # Run on 2025-08-13 at 17:01 UTC (18:01 Netherlands)
    - cron: '1 17 13 8 *'  # minute hour day month weekday
```

### **Step 3: Cron Format Breakdown**
```
'1 17 13 8 *'
 │  │  │  │ │
 │  │  │  │ └── Day of week (0-6, * = any)
 │  │  │  └──── Month (1-12)
 │  │  └─────── Day of month (1-31)  
 │  └────────── Hour (0-23, 17 = 5 PM UTC)
 └───────────── Minute (0-59, 1 = 1 minute past)
```

### **Step 4: Customize Booking**
Change these lines in the workflow:
```yaml
node reserve.mjs --date "2025-08-15" --start "09:00" --end "17:00" --resource "565"
```

## 📋 **Quick Reference**

| Target Date | Schedule For | Cron Expression | Example |
|-------------|--------------|-----------------|---------|
| 2025-08-11 | 2025-08-09 18:01 | `'1 17 9 8 *'` | ✅ Done |
| 2025-08-12 | 2025-08-10 18:01 | `'1 17 10 8 *'` | Copy & edit |
| 2025-08-13 | 2025-08-11 18:01 | `'1 17 11 8 *'` | Copy & edit |
| 2025-08-14 | 2025-08-12 18:01 | `'1 17 12 8 *'` | Copy & edit |

## 🚀 **Deploy Your Scheduled Booking**

```bash
git add .github/workflows/schedule-booking-2025-08-11.yml
git commit -m "Schedule automatic booking for 2025-08-11 at optimal time"
git push
```

## ⏰ **What Happens Next**

1. **GitHub waits** until 2025-08-09 at 18:01
2. **Workflow triggers** automatically  
3. **Books 2025-08-11** exactly when booking window opens
4. **You get confirmation** in the Actions log
5. **Laptop stays off** - everything happens in the cloud!

## 💡 **Pro Tips**

- **One workflow per date**: Create separate files for each target date
- **Test first**: Use manual trigger to test before scheduling
- **Backup plan**: Create multiple workflows for different resources
- **Clean up**: Delete workflow files after successful booking

Your booking for 2025-08-11 is now scheduled! 🎯