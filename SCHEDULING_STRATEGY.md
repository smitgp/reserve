# 📅 Optimal Booking Schedule Strategy

## ⏰ **When to Book What**

| Target Date | Book On | Book At | Example |
|-------------|---------|---------|---------|
| 2025-08-08 (Thu) | 2025-08-06 (Tue) | 18:01 | Book Thursday on Tuesday evening |
| 2025-08-09 (Fri) | 2025-08-07 (Wed) | 18:01 | Book Friday on Wednesday evening |
| 2025-08-10 (Sat) | 2025-08-08 (Thu) | 18:01 | Book Saturday on Thursday evening |

## 🎯 **Current Scheduled Workflow**

**File**: `.github/workflows/scheduled-reservation.yml`
- **Runs**: Every day at 17:01 UTC (18:01/19:01 Netherlands time)
- **Books**: Day after tomorrow (2 days ahead)
- **Strategy**: Catches the booking window exactly when it opens

## 💰 **GitHub Actions Cost Breakdown**

### **FREE Usage (Public Repo)**
- ✅ **Cost**: $0.00/month
- ✅ **Minutes**: Unlimited
- ✅ **Your usage**: ~2-3 minutes/day = FREE

### **Private Repo Costs**
- 🆓 **Free tier**: 2,000 minutes/month
- 📊 **Your daily usage**: ~3 minutes
- 📊 **Monthly usage**: ~90 minutes (well within free tier)
- 💵 **If exceeded**: $0.008/minute ($0.72/hour)

### **Annual Cost Estimate**
- **Public repo**: $0
- **Private repo**: $0 (within free tier)

## 🔧 **Schedule Customization**

### **Change Booking Time**
Edit line 7 in `scheduled-reservation.yml`:
```yaml
# Current: 18:01 Netherlands time
- cron: '1 17 * * *'

# Alternative times:
- cron: '0 18 * * *'    # Exactly 18:00 (19:00/20:00 Netherlands)
- cron: '5 17 * * *'    # 18:05 (19:05/20:05 Netherlands) 
- cron: '1 12 * * *'    # 13:01 (14:01/15:01 Netherlands)
```

### **Change Booking Window**
Edit lines 71-73 in `scheduled-reservation.yml`:
```bash
# Current: Book 2 days ahead
TARGET_DATE=$(date -d '+2 days' '+%Y-%m-%d')

# Alternatives:
TARGET_DATE=$(date -d '+1 day' '+%Y-%m-%d')   # Book tomorrow
TARGET_DATE=$(date -d '+3 days' '+%Y-%m-%d')  # Book 3 days ahead
```

### **Multiple Daily Attempts**
```yaml
schedule:
  # Try twice: when tomorrow opens + when day-after-tomorrow opens
  - cron: '1 17 * * *'    # 18:01 for day-after-tomorrow
  - cron: '1 6 * * *'     # 07:01 for tomorrow
```

## 📊 **Monitoring & Success Rate**

### **Track Success**
- Go to Actions tab → View workflow runs
- Green ✅ = Successful booking
- Red ❌ = Failed (check logs for reason)

### **Typical Success Patterns**
- **High success**: Popular times (9-17h) on less popular resources
- **Medium success**: Popular times on popular resources (565-570)
- **Low success**: Peak hours on most popular resources

### **Backup Strategy**
If main resource fails, manually run with different resources:
```
Resource 565 → try 566, 567, 568
Resource 175 → try 176, 177, 178
```

## 🚀 **Quick Start**

1. **Commit the scheduled workflow:**
   ```bash
   git add .github/workflows/scheduled-reservation.yml
   git commit -m "Add optimal booking schedule strategy"
   git push
   ```

2. **It will automatically:**
   - Run daily at 18:01 Netherlands time
   - Book 2 days ahead when booking window opens
   - Use your default settings (10:00-17:00, Resource 565)

3. **Monitor results:**
   - Check Actions tab daily
   - View logs for booking confirmations
   - Adjust schedule if needed

## 💡 **Pro Tips**

- **Peak booking window**: First 5 minutes after 18:01 are crucial
- **Resource strategy**: Have backup resources ready
- **Time flexibility**: Slightly off-peak hours (9:30-16:30) often better availability
- **Weekend strategy**: Saturday/Sunday slots often easier to get

Your automated booking system now runs at the optimal time! 🎯