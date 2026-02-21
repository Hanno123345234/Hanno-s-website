import 'package:flutter/material.dart';

import '../progress/log_workout_sheet.dart';
import '../progress/workout_history_controller.dart';
import 'create_workout_screen.dart';
import 'workout_detail_screen.dart';
import 'workouts_controller.dart';

class WorkoutsScreen extends StatefulWidget {
  const WorkoutsScreen({
    super.key,
    required this.controller,
    required this.history,
  });

  final WorkoutsController controller;
  final WorkoutHistoryController history;

  @override
  State<WorkoutsScreen> createState() => _WorkoutsScreenState();
}

class _WorkoutsScreenState extends State<WorkoutsScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  Future<void> _completeWorkout(BuildContext context, String workoutId) async {
    final workout = widget.controller.workouts.where((w) => w.id == workoutId).first;
    final ok = await showLogWorkoutSheet(
      context,
      workout: workout,
      history: widget.history,
    );
    if (ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Workout gespeichert')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final workouts = widget.controller.workouts;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workouts'),
        actions: [
          IconButton(
            tooltip: 'Workout erstellen',
            onPressed: () async {
              final created = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => CreateWorkoutScreen(controller: widget.controller),
                ),
              );
              if (created == true && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Workout gespeichert')),
                );
              }
            },
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (workouts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('Noch keine Workouts. Erstelle dein erstes!'),
            ),
          for (final w in workouts)
            Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.bolt)),
                title: Text(w.name),
                subtitle: Text(
                  '${(w.durationSeconds / 60).round()} min'
                  '${w.exercises.isEmpty ? '' : ' • ${w.exercises.length} Übungen'}',
                ),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => WorkoutDetailScreen(
                        workoutId: w.id,
                        workouts: widget.controller,
                        history: widget.history,
                      ),
                    ),
                  );
                },
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Workout abschließen',
                      onPressed: () => _completeWorkout(context, w.id),
                      icon: const Icon(Icons.play_circle_outline),
                    ),
                    IconButton(
                      tooltip: 'Löschen',
                      onPressed: () async {
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text('Workout löschen?'),
                            content: Text('"${w.name}" wird entfernt.'),
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
                          await widget.controller.deleteWorkout(w.id);
                        }
                      },
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}
