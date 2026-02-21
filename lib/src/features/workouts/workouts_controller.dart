import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../../data/local_store.dart';
import 'workout_models.dart';

class WorkoutsController extends ChangeNotifier {
  WorkoutsController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _key = 'workouts.items';

  bool _isReady = false;
  final List<Workout> _workouts = <Workout>[];

  bool get isReady => _isReady;
  List<Workout> get workouts => List<Workout>.unmodifiable(_workouts);

  Future<void> load() async {
    final raw = await _store.getString(_key);
    _workouts
      ..clear()
      ..addAll(_decode(raw));
    _isReady = true;
    notifyListeners();
  }

  Future<Workout> createWorkout({
    required String name,
    required int durationSeconds,
    String? notes,
    List<WorkoutExercise> exercises = const <WorkoutExercise>[],
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw StateError('Bitte gib einen Namen ein');
    }

    final workout = Workout(
      id: const Uuid().v4(),
      name: trimmed,
      durationSeconds: durationSeconds,
      notes: notes?.trim().isEmpty ?? true ? null : notes!.trim(),
      createdAtMs: DateTime.now().millisecondsSinceEpoch,
      exercises: List<WorkoutExercise>.unmodifiable(exercises),
    );

    _workouts.insert(0, workout);
    await _persist();
    notifyListeners();
    return workout;
  }

  Future<void> deleteWorkout(String id) async {
    _workouts.removeWhere((w) => w.id == id);
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final raw = encodeJson(_workouts.map((w) => w.toJson()).toList(growable: false));
    await _store.setString(_key, raw);
  }

  List<Workout> _decode(String? raw) {
    if (raw == null || raw.isEmpty) return const <Workout>[];
    try {
      final list = decodeJsonList(raw);
      return list
          .whereType<Map>()
          .map((m) => Workout.fromJson(m.cast<String, Object?>()))
          .toList(growable: false);
    } catch (_) {
      return const <Workout>[];
    }
  }
}
