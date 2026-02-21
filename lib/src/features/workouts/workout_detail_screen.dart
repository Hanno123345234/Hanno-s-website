import 'package:flutter/material.dart';

import '../progress/log_workout_sheet.dart';
import '../progress/workout_history_controller.dart';
import 'workout_models.dart';
import 'workout_session_screen.dart';
import 'workouts_controller.dart';

class WorkoutDetailScreen extends StatefulWidget {
  const WorkoutDetailScreen({
    super.key,
    required this.workoutId,
    required this.workouts,
    required this.history,
  });

  final String workoutId;
  final WorkoutsController workouts;
  final WorkoutHistoryController history;

  @override
  State<WorkoutDetailScreen> createState() => _WorkoutDetailScreenState();
}

class _WorkoutDetailScreenState extends State<WorkoutDetailScreen> {
  @override
  void initState() {
    super.initState();
    widget.workouts.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.workouts.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  Workout? _findWorkout() {
    for (final w in widget.workouts.workouts) {
      if (w.id == widget.workoutId) return w;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final workout = _findWorkout();
    if (workout == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Workout')),
        body: const Center(child: Text('Workout nicht gefunden.')),
      );
    }

    final minutes = (workout.durationSeconds / 60).round();

    return Scaffold(
      appBar: AppBar(
        title: Text(workout.name),
        actions: [
          IconButton(
            tooltip: 'Schnell abschließen',
            onPressed: () async {
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
            },
            icon: const Icon(Icons.check_circle_outline),
          ),
          IconButton(
            tooltip: 'Löschen',
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Workout löschen?'),
                  content: Text('"${workout.name}" wird entfernt.'),
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
                await widget.workouts.deleteWorkout(workout.id);
                if (context.mounted) Navigator.of(context).pop();
              }
            },
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Details', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text('$minutes min • ${workout.exercises.length} Übungen'),
                  if (workout.notes != null && workout.notes!.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text('Notizen', style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text(workout.notes!),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Übungen', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (workout.exercises.isEmpty)
                    const Text('Noch keine Übungen hinterlegt.')
                  else
                    for (final e in workout.exercises)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.fitness_center),
                        title: Text(e.name),
                        subtitle: Text(
                          '${e.sets}×${e.reps}${e.weightKg == null ? '' : ' • ${e.weightKg} kg'}',
                        ),
                      ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: workout.exercises.isEmpty
                ? null
                : () async {
                    final finished = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(
                        builder: (_) => WorkoutSessionScreen(
                          workout: workout,
                          history: widget.history,
                        ),
                      ),
                    );
                    if (finished == true && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Workout gespeichert')),
                      );
                    }
                  },
            icon: const Icon(Icons.play_arrow),
            label: const Text('Workout starten'),
          ),
          if (workout.exercises.isEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Tipp: Beim Erstellen des Workouts Übungen hinzufügen, dann kannst du es starten.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
