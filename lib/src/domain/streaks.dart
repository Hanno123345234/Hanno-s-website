import 'package:intl/intl.dart';

/// Computes a “challenge day” based on local time + reset hour.
///
/// If resetHourLocal = 0 => calendar day.
/// If resetHourLocal = 4 and now is 02:00 => counts as previous day.
String dateKeyForNow({required DateTime nowLocal, required int resetHourLocal}) {
  final adjusted = nowLocal.subtract(Duration(hours: resetHourLocal));
  return DateFormat('yyyyMMdd').format(adjusted);
}

String dateKeyForDay({required DateTime dayLocal, required int resetHourLocal}) {
  final adjusted = dayLocal.subtract(Duration(hours: resetHourLocal));
  return DateFormat('yyyyMMdd').format(adjusted);
}

String previousDateKey(String currentDateKey) {
  final dt = DateFormat('yyyyMMdd').parseStrict(currentDateKey);
  final prev = dt.subtract(const Duration(days: 1));
  return DateFormat('yyyyMMdd').format(prev);
}

bool isStreakAtRisk({
  required DateTime nowLocal,
  required int riskHourLocal,
  required bool alreadyCheckedInToday,
}) {
  if (alreadyCheckedInToday) return false;
  return nowLocal.hour >= riskHourLocal;
}
