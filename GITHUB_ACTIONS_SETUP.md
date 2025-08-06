# GitHub Actions Setup Guide

## 🚀 **Automated Library Reservations**

Your repository now has a GitHub Actions workflow that can run your reservation script automatically while your laptop is off!

## ⚠️ **Important: Booking Window Restrictions**

**CRITICAL**: The library booking system only allows reservations for:
- ✅ **Today** (current date)
- ✅ **Tomorrow** (next day) 
- ✅ **Day after tomorrow** (available in the evening, timing varies)

❌ **You CANNOT book dates beyond this window!** Always use dates within 1-2 days of today.

## 📋 **Setup Steps**

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Add automated reservation workflows"
git push
```

### 2. **Configure Secrets**
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **Repository Secrets**:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `EMAIL` | Your email | `g.smit92@gmail.com` |
| `LOCATION` | Library location | `41` |
| `TYPE` | Reservation type | `36` |
| `BASE_EMAIL` | Your base email | `g.smit92@gmail.com` |
| `ENGINE_BODY` | Form data from .env | `form-id=1&csrf-key=dummy&submit...` |

### 3. **Test Manual Run**
1. Go to **Actions** tab in your GitHub repo
2. Click **"Library Reservation"** workflow
3. Click **"Run workflow"**
4. Enter your test parameters:
   - Date: `2025-08-07` (tomorrow - always use today/tomorrow!)
   - Start: `15:00`
   - End: `16:00`
   - Resource: `175` (170-180 range good for testing)
5. Click **"Run workflow"**

## 📅 **Reservation Methods**

### **Manual Reservation (Primary Method)**
- **Workflow**: `manual-reservation.yml` 
- **Trigger**: Manual button click in GitHub Actions
- **What it does**: Books your specified date/time/resource
- **Perfect for**: All your reservation needs with laptop off

### **Commit-Based Reservations (Alternative)**
- **File**: `reservations.json`
- **Method**: Commit reservation requests to trigger automated booking
- **What it does**: Processes pending reservations from the config file
- **Perfect for**: Planning multiple reservations in advance

## 💡 **Usage Examples**

### **Method 1: GitHub Actions UI (Recommended)**
1. Go to Actions → Library Reservation
2. Click "Run workflow"
3. Enter your parameters:
   ```
   Date: 2025-08-07
   Start: 15:00
   End: 16:00  
   Resource: 175
   ```
4. Click "Run workflow"
5. Check results in workflow logs

### **Method 2: Commit Configuration File**
1. Edit `reservations.json` to add your request:
   ```json
   {
     "pending_reservations": [
       {
         "id": "my_reservation_1",
         "date": "2025-08-07",
         "start_time": "15:00", 
         "end_time": "16:00",
         "resource": "175",
         "description": "Study session",
         "status": "pending"
       }
     ]
   }
   ```
2. Commit and push the file
3. Manually trigger the workflow to process pending reservations

## ⚠️ **Booking Window Guidelines**

### **Timing Strategy**
- **Morning (before 10 AM)**: Book today + tomorrow
- **Evening (after 6 PM)**: Tomorrow + day after tomorrow become available
- **Always check**: Use today's date or tomorrow's date in your requests

### **Resource Strategy** 
- **Resources 565-570**: Most popular, book early
- **Resources 170-180**: Good for testing, less crowded
- **Multiple resources**: Try different resources if preferred one is full

### **Time Slot Strategy**
- **Peak hours**: 09:00-17:00 (book early)
- **Off-peak**: Early morning/evening slots more available
- **Duration**: Script handles 1-hour minimum, can book multiple hours

## 📊 **Monitoring Results**

### **Success Indicators**
- ✅ Workflow shows green checkmark
- 📝 Logs show "Successfully booked" messages
- 📧 Each booking shows which email was used

### **Failure Handling**
- ❌ Workflow shows red X if failed
- 📁 Debug files automatically uploaded as artifacts
- 🔍 Check workflow logs for detailed error messages

### **View Logs**
1. Go to Actions tab
2. Click on any workflow run
3. Click on the "reserve" job
4. Expand "Make reservation" step

## 💡 **Pro Tips**

### **Plan Ahead**
- **Add to reservations.json**: Queue up multiple reservations
- **Set reminders**: Library booking windows are strict
- **Backup resources**: Always have alternative resource IDs ready

### **Troubleshooting Quick Wins**
- **Wrong date error**: Use tomorrow's date (today + 1 day)
- **No slots available**: Try different resource (170-180 range)
- **Form errors**: Check that secrets are properly configured

### **Batch Reservations**
```json
{
  "pending_reservations": [
    {"date": "2025-08-07", "start_time": "09:00", "end_time": "12:00", "resource": "175"},
    {"date": "2025-08-07", "start_time": "13:00", "end_time": "16:00", "resource": "176"}
  ]
}
```

## 🔒 **Security Notes**

- ✅ Secrets are encrypted and only accessible to workflows
- ✅ .env file is created dynamically and never committed
- ✅ No sensitive data stored in repository
- ✅ Each workflow run uses fresh credentials

## 🆘 **Troubleshooting**

### **"No slots available"**
- Library booking window might have changed
- Resource might be fully booked
- Check if date is within booking window (today/tomorrow only)

### **"Form data extraction failed"**
- Library website might have updated form structure
- Form IDs change dynamically (script handles this automatically)
- Check workflow logs for specific error details

### **Workflow not running**
- Check repository is public or GitHub Actions enabled for private repo
- Verify cron syntax is correct
- GitHub Actions might have delays during high usage

Your automated reservation system is now ready! 🎉