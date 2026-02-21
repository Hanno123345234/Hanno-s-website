import 'package:flutter/material.dart';

import '../workouts/workouts_controller.dart';
import 'workout_history_controller.dart';

class WorkoutHistoryScreen extends StatelessWidget {
  const WorkoutHistoryScreen({
    super.key,
    required this.history,
    required this.workouts,
  });

  final WorkoutHistoryController history;
  final WorkoutsController workouts;

  String _formatDate(int ms) {
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    final d = dt.day.toString().padLeft(2, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final y = dt.year.toString();
    return '$d.$m.$y';
  }

  String _workoutName(String id) {
    try {
      return workouts.workouts.firstWhere((w) => w.id == id).name;
    } catch (_) {
      return 'Workout';
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([history, workouts]),
      builder: (context, _) {
        final sessions = history.sessions;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Verlauf'),
          ),
          body: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.local_fire_department_outlined),
                  title: const Text('Aktueller Streak'),
                  trailing: Text('${history.streakDays} Tage'),
                  subtitle: Text('${history.totalCompleted} Workouts abgeschlossen'),
                ),
              ),
              const SizedBox(height: 12),
              Text('Letzte Workouts', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (sessions.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Noch kein Verlauf. Schließe ein Workout ab!'),
                  ),
                ),
              for (final s in sessions)
                Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.check)),
                    title: Text(_workoutName(s.workoutId)),
                    subtitle: Text('${_formatDate(s.completedAtMs)} • ${(s.durationSeconds / 60).round()} min'),
                    trailing: IconButton(
                      tooltip: 'Löschen',
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text('Eintrag löschen?'),
                            content: Text('${_workoutName(s.workoutId)} (${_formatDate(s.completedAtMs)})'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Abbrechen'),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Löschen'),
                              ),
                            ],
                          ),
                        );
                        if (ok == true) {
                          await history.deleteSession(s.id);
                        }
                      },
                    ),
                  ),
                ),
              const SizedBox(height: 80),
            ],
          ),
        );
      },
    );
  }
}
