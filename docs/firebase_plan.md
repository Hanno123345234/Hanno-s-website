# Firebase production plan

This MVP is local-only (single device). For real friend challenges across phones, add Firebase.

## Auth
- Firebase Auth
- Sign-in providers: Apple + Google

## Data model (Firestore)
- `users/{uid}`
  - displayName
  - createdAt

- `challenges/{challengeId}`
  - name
  - ownerUserId
  - goalText
  - goalCount
  - startDateIso
  - durationDays
  - isEndless
  - resetHourLocal (or timezoneId + resetHour)
  - inviteCode
  - createdAt

- `challenges/{challengeId}/members/{uid}`
  - joinedAt
  - currentStreak
  - longestStreak
  - lastCheckinDateKey
  - completionCount

- `challenges/{challengeId}/checkins/{uid_YYYYMMDD}`
  - uid
  - dateKey
  - createdAt
  - proofType
  - comment
  - emoji
  - timerSeconds
  - photoUrl

## Cloud Functions (recommended)
- Enforce idempotent check-in per day
- Compute streaks server-side to prevent cheating
- Trigger FCM: "X friends already checked in" after certain thresholds

## Storage (proof photos)
- Firebase Storage with per-user write rules
- Store download URL in checkin doc
