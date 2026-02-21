# MVP Flow

Core loop: Create → Join → Confirm → Compare → Repeat.

## Screens
- Login (MVP: name; prod: Apple/Google)
- Home (list challenges)
- Create challenge
- Join via invite code
- Challenge detail (today check-in + streak)
- Compare (today status + leaderboard)
- Reminder settings

## Streak logic
- Compute `dateKey` as local time minus resetHour.
- Check-in is 1 per user per dateKey (idempotent in prod).
- Streak increments if lastCheckinDateKey == yesterdayKey.
- "Streak at risk" after 18:00 local if not checked in.
