import 'package:flutter/material.dart';

import '../workouts/workout_models.dart';
import 'workout_history_controller.dart';

Future<bool> showLogWorkoutSheet(
  BuildContext context, {
  required Workout workout,
  required WorkoutHistoryController history,
}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) {
      final minutesCtrl = TextEditingController(
        text: (workout.durationSeconds / 60).round().toString(),
      );
      final notesCtrl = TextEditingController();

      return Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 8,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Workout abschließen', style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(workout.name, style: Theme.of(ctx).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextField(
              controller: minutesCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Dauer (Minuten)',
                hintText: 'z.B. 45',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Notizen (optional)',
                hintText: 'z.B. PR beim Bankdrücken',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () async {
                final raw = minutesCtrl.text.trim();
                final minutes = int.tryParse(raw);
                if (minutes == null || minutes <= 0) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(content: Text('Bitte gültige Dauer eingeben.')),
                  );
                  return;
                }
                await history.logSession(
                  workoutId: workout.id,
                  durationSeconds: minutes * 60,
                  notes: notesCtrl.text,
                );
                if (ctx.mounted) Navigator.of(ctx).pop(true);
              },
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Speichern'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Abbrechen'),
            ),
          ],
        ),
      );
    },
  );

  return saved == true;
}
