import 'dart:async';

import 'package:flutter/material.dart';

import '../progress/workout_history_controller.dart';
import 'workout_models.dart';

class WorkoutSessionScreen extends StatefulWidget {
  const WorkoutSessionScreen({
    super.key,
    required this.workout,
    required this.history,
  });

  final Workout workout;
  final WorkoutHistoryController history;

  @override
  State<WorkoutSessionScreen> createState() => _WorkoutSessionScreenState();
}

class _WorkoutSessionScreenState extends State<WorkoutSessionScreen> {
  final Stopwatch _stopwatch = Stopwatch();
  Timer? _tick;

  late final Map<String, int> _setsDoneByExerciseId;

  bool _finishing = false;

  @override
  void initState() {
    super.initState();
    _setsDoneByExerciseId = <String, int>{
      for (final e in widget.workout.exercises) e.id: 0,
    };
    _stopwatch.start();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _stopwatch.stop();
    super.dispose();
  }

  String _fmt(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  int get _elapsedSeconds => _stopwatch.elapsed.inSeconds;

  int get _plannedSeconds => widget.workout.durationSeconds;

  int get _totalSets {
    var total = 0;
    for (final e in widget.workout.exercises) {
      total += e.sets;
    }
    return total;
  }

  int get _doneSets {
    var total = 0;
    for (final e in widget.workout.exercises) {
      total += (_setsDoneByExerciseId[e.id] ?? 0);
    }
    return total;
  }

  Future<void> _finish() async {
    if (_finishing) return;
    setState(() => _finishing = true);
    try {
      final notesCtrl = TextEditingController();
      final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (ctx) {
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
                Text(widget.workout.name, style: Theme.of(ctx).textTheme.titleMedium),
                const SizedBox(height: 12),
                Text('Dauer: ${_fmt(_elapsedSeconds)}'),
                Text('Sets: $_doneSets / $_totalSets'),
                const SizedBox(height: 12),
                TextField(
                  controller: notesCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notizen (optional)',
                    hintText: 'z.B. PR, Technik, Feeling …',
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () async {
                    await widget.history.logSession(
                      workoutId: widget.workout.id,
                      durationSeconds: _elapsedSeconds <= 0 ? 1 : _elapsedSeconds,
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

      if (!mounted) return;
      if (saved == true) {
        Navigator.of(context).pop(true);
      }
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final planned = _plannedSeconds <= 0 ? null : _plannedSeconds;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workout läuft'),
        actions: [
          TextButton(
            onPressed: _finishing ? null : _finish,
            child: _finishing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Fertig'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.workout.name,
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 6),
                        Text(
                          'Zeit: ${_fmt(_elapsedSeconds)}'
                          '${planned == null ? '' : ' • Plan: ${_fmt(planned)}'}',
                        ),
                        const SizedBox(height: 6),
                        Text('Sets: $_doneSets / $_totalSets'),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filledTonal(
                    tooltip: _stopwatch.isRunning ? 'Pause' : 'Weiter',
                    onPressed: () {
                      setState(() {
                        if (_stopwatch.isRunning) {
                          _stopwatch.stop();
                        } else {
                          _stopwatch.start();
                        }
                      });
                    },
                    icon: Icon(_stopwatch.isRunning ? Icons.pause : Icons.play_arrow),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          for (final e in widget.workout.exercises)
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(e.name, style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text(
                      '${e.sets}×${e.reps}${e.weightKg == null ? '' : ' • ${e.weightKg} kg'}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (e.notes != null && e.notes!.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(e.notes!, style: Theme.of(context).textTheme.bodySmall),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Sets done:'),
                        const SizedBox(width: 12),
                        IconButton(
                          tooltip: 'Minus',
                          onPressed: () {
                            setState(() {
                              final current = _setsDoneByExerciseId[e.id] ?? 0;
                              _setsDoneByExerciseId[e.id] = (current - 1).clamp(0, e.sets);
                            });
                          },
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text('${_setsDoneByExerciseId[e.id] ?? 0} / ${e.sets}'),
                        IconButton(
                          tooltip: 'Plus',
                          onPressed: () {
                            setState(() {
                              final current = _setsDoneByExerciseId[e.id] ?? 0;
                              _setsDoneByExerciseId[e.id] = (current + 1).clamp(0, e.sets);
                            });
                          },
                          icon: const Icon(Icons.add_circle_outline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 80),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _finishing ? null : _finish,
        icon: const Icon(Icons.check),
        label: const Text('Workout beenden'),
      ),
    );
  }
}
