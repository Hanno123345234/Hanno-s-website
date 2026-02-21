import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../../data/local_store.dart';
import 'workout_history_models.dart';

class WorkoutHistoryController extends ChangeNotifier {
  WorkoutHistoryController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _key = 'workouts.history.sessions';

  bool _isReady = false;
  final List<WorkoutSession> _sessions = <WorkoutSession>[];

  bool get isReady => _isReady;
  List<WorkoutSession> get sessions => List<WorkoutSession>.unmodifiable(_sessions);

  int get totalCompleted => _sessions.length;

  WorkoutSession? get latest => _sessions.isEmpty ? null : _sessions.first;

  int get streakDays => _computeStreakDays();

  Future<void> load() async {
    final raw = await _store.getString(_key);
    _sessions
      ..clear()
      ..addAll(_decode(raw));
    _sessions.sort((a, b) => b.completedAtMs.compareTo(a.completedAtMs));
    _isReady = true;
    notifyListeners();
  }

  Future<void> logSession({
    required String workoutId,
    required int durationSeconds,
    String? notes,
    DateTime? at,
  }) async {
    final entry = WorkoutSession(
      id: const Uuid().v4(),
      workoutId: workoutId,
      completedAtMs: (at ?? DateTime.now()).millisecondsSinceEpoch,
      durationSeconds: durationSeconds,
      notes: notes?.trim().isEmpty ?? true ? null : notes!.trim(),
    );

    _sessions.insert(0, entry);
    await _persist();
    notifyListeners();
  }

  Future<void> deleteSession(String id) async {
    _sessions.removeWhere((s) => s.id == id);
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final raw = encodeJson(_sessions.map((s) => s.toJson()).toList(growable: false));
    await _store.setString(_key, raw);
  }

  List<WorkoutSession> _decode(String? raw) {
    if (raw == null || raw.isEmpty) return const <WorkoutSession>[];
    try {
      final list = decodeJsonList(raw);
      return list
          .whereType<Map>()
          .map((m) => WorkoutSession.fromJson(m.cast<String, Object?>()))
          .where((s) => s.id.isNotEmpty && s.workoutId.isNotEmpty)
          .toList(growable: false);
    } catch (_) {
      return const <WorkoutSession>[];
    }
  }

  int _computeStreakDays() {
    if (_sessions.isEmpty) return 0;

    final days = <String>{
      for (final s in _sessions) _dayKey(DateTime.fromMillisecondsSinceEpoch(s.completedAtMs)),
    };

    var cursor = DateTime.now();
    var streak = 0;
    for (var i = 0; i < 3650; i++) {
      final key = _dayKey(cursor);
      if (!days.contains(key)) break;
      streak++;
      cursor = cursor.subtract(const Duration(days: 1));
    }

    return streak;
  }

  String _dayKey(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
