import 'dart:convert';

class WorkoutExercise {
  const WorkoutExercise({
    required this.id,
    required this.name,
    required this.sets,
    required this.reps,
    required this.weightKg,
    required this.notes,
  });

  final String id;
  final String name;
  final int sets;
  final int reps;
  final double? weightKg;
  final String? notes;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'sets': sets,
        'reps': reps,
        'weightKg': weightKg,
        'notes': notes,
      };

  static WorkoutExercise fromJson(Map<String, Object?> json) {
    return WorkoutExercise(
      id: json['id'] as String,
      name: (json['name'] as String?) ?? '',
      sets: (json['sets'] as num?)?.toInt() ?? 0,
      reps: (json['reps'] as num?)?.toInt() ?? 0,
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );
  }
}

class Workout {
  const Workout({
    required this.id,
    required this.name,
    required this.durationSeconds,
    required this.notes,
    required this.createdAtMs,
    required this.exercises,
  });

  final String id;
  final String name;

  /// Total workout duration (rough estimate) in seconds.
  final int durationSeconds;

  final String? notes;
  final int createdAtMs;

  final List<WorkoutExercise> exercises;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'durationSeconds': durationSeconds,
        'notes': notes,
        'createdAtMs': createdAtMs,
      'exercises': exercises.map((e) => e.toJson()).toList(growable: false),
      };

  static Workout fromJson(Map<String, Object?> json) {
    final exercisesRaw = json['exercises'];
    final exercises = <WorkoutExercise>[];
    if (exercisesRaw is List) {
      for (final item in exercisesRaw) {
        if (item is Map) {
          exercises.add(WorkoutExercise.fromJson(item.cast<String, Object?>()));
        }
      }
    }

    return Workout(
      id: json['id'] as String,
      name: json['name'] as String,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      notes: json['notes'] as String?,
      createdAtMs: (json['createdAtMs'] as num?)?.toInt() ?? 0,
      exercises: exercises,
    );
  }
}

String encodeJson(Object value) => jsonEncode(value);

Map<String, Object?> decodeJsonMap(String value) {
  return (jsonDecode(value) as Map).cast<String, Object?>();
}

List<Object?> decodeJsonList(String value) {
  return (jsonDecode(value) as List).cast<Object?>();
}
