# GitHub Actions Setup Guide

## 🚀 **Automated Daily Reservations**

Your repository now has GitHub Actions workflows that can run your reservation script automatically while your laptop is off!

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
2. Click **"Manual Reservation"** workflow
3. Click **"Run workflow"**
4. Enter your test parameters:
   - Date: `2025-08-07`
   - Start: `10:00`
   - End: `13:00`
   - Resource: `565`
5. Click **"Run workflow"**

## ⏰ **Automated Schedules**

### **Daily Reservation (6 AM UTC)**
- **Workflow**: `daily-reservation.yml`
- **Schedule**: Every day at 6:00 AM UTC
- **What it does**: Books tomorrow's slots (09:00-18:00 on Resource 565)
- **Customizable**: Edit the workflow file to change times/resource

### **Manual Reservation (On-Demand)**
- **Workflow**: `manual-reservation.yml`
- **Trigger**: Manual button click
- **What it does**: Books any date/time you specify
- **Perfect for**: One-off bookings or testing

## 🌍 **Timezone Configuration**

The default schedule is `6:00 AM UTC`. To adjust for your timezone:

**Netherlands (UTC+1/+2):**
```yaml
# 5 AM UTC = 6 AM CET / 7 AM CEST
- cron: '0 5 * * *'
```

**Common schedules:**
- `'0 6 * * *'` - Daily at 6 AM UTC
- `'0 6 * * 1-5'` - Weekdays only at 6 AM UTC
- `'0 6,12,18 * * *'` - Three times daily (6 AM, 12 PM, 6 PM UTC)

## 🎯 **Usage Examples**

### **Daily Automation**
- Automatically books Resource 565 for 09:00-18:00 tomorrow
- Runs every day at 6 AM UTC
- No manual intervention needed

### **Manual Booking**
1. Go to Actions → Manual Reservation
2. Specify date, times, resource
3. Click run
4. Check results in workflow logs

### **Modify Daily Schedule**
Edit `.github/workflows/daily-reservation.yml`:
```yaml
# Change default resource
RESOURCE: ${{ github.event.inputs.resource || '566' }}

# Change default times  
START_TIME: ${{ github.event.inputs.start_time || '08:00' }}
END_TIME: ${{ github.event.inputs.end_time || '17:00' }}

# Change schedule (runs at 5 AM UTC instead)
- cron: '0 5 * * *'
```

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

### **Multiple Resource Strategy**
Create separate workflows for different resources:
```bash
cp .github/workflows/daily-reservation.yml .github/workflows/daily-resource-566.yml
# Edit the new file to use resource 566
```

### **Backup Strategy**
```yaml
# Run multiple times per day
- cron: '0 6,12,18 * * *'
```

### **Weekend vs Weekday**
```yaml
# Weekdays: full day
- cron: '0 6 * * 1-5'
# Weekends: shorter hours  
- cron: '0 8 * * 6,7'
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