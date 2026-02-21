import 'dart:convert';

String encodeJson(Object value) => jsonEncode(value);

List<Object?> decodeJsonList(String value) {
  return (jsonDecode(value) as List).cast<Object?>();
}

class WorkoutSession {
  const WorkoutSession({
    required this.id,
    required this.workoutId,
    required this.completedAtMs,
    required this.durationSeconds,
    this.notes,
  });

  final String id;
  final String workoutId;
  final int completedAtMs;
  final int durationSeconds;
  final String? notes;

  Map<String, Object?> toJson() => <String, Object?>{
        'id': id,
        'workoutId': workoutId,
        'completedAtMs': completedAtMs,
        'durationSeconds': durationSeconds,
        'notes': notes,
      };

  static WorkoutSession fromJson(Map<String, Object?> json) {
    return WorkoutSession(
      id: (json['id'] as String?) ?? '',
      workoutId: (json['workoutId'] as String?) ?? '',
      completedAtMs: (json['completedAtMs'] as num).toInt(),
      durationSeconds: (json['durationSeconds'] as num).toInt(),
      notes: json['notes'] as String?,
    );
  }
}
