# Library Reservation Bot

Automated library booking with GitHub Actions.

## Quick Setup

1. **Add GitHub secrets** (Settings → Secrets and variables → Actions):
   - `EMAIL`
   - `LOCATION` 
   - `TYPE`
   - `BASE_EMAIL`
   - `ENGINE_BODY`

2. **Schedule a booking**:
   - Copy `.github/workflows/cron-booking-template.yml`
   - Rename to `book-YYYY-MM-DD.yml`
   - Update the template fields
   - Commit and push

## Template Usage

**To book 2025-08-11:**

1. Copy template → `.github/workflows/book-2025-08-11.yml`
2. Change:
   ```yaml
   name: Book 2025-08-11
   - cron: '1 17 9 8 *'  # 2025-08-09 at 18:01
   node reserve.mjs --date "2025-08-11" --start "09:00" --end "17:00" --resource "565"
   ```
3. Commit and push

## Cron Calculator

Target date → Schedule date (2 days before at 18:01) → Cron

- 2025-08-11 → 2025-08-09 18:01 → `'1 17 9 8 *'`
- 2025-08-12 → 2025-08-10 18:01 → `'1 17 10 8 *'`
- 2025-08-15 → 2025-08-13 18:01 → `'1 17 13 8 *'`

Format: `'minute hour day month weekday'`

## Testing

Each workflow has manual trigger for testing before the scheduled time.

That's it! 🎯