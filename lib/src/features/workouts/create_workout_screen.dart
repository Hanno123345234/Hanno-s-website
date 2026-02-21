import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import 'workout_models.dart';
import 'workouts_controller.dart';

class CreateWorkoutScreen extends StatefulWidget {
  const CreateWorkoutScreen({super.key, required this.controller});

  final WorkoutsController controller;

  @override
  State<CreateWorkoutScreen> createState() => _CreateWorkoutScreenState();
}

class _CreateWorkoutScreenState extends State<CreateWorkoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  int _minutes = 22;
  bool _saving = false;

  final List<WorkoutExercise> _exercises = <WorkoutExercise>[];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => _saving = true);
    try {
      await widget.controller.createWorkout(
        name: _nameCtrl.text,
        durationSeconds: _minutes * 60,
        notes: _notesCtrl.text,
        exercises: _exercises,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Speichern fehlgeschlagen: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addExercise() async {
    final created = await showModalBottomSheet<WorkoutExercise>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        final formKey = GlobalKey<FormState>();
        final nameCtrl = TextEditingController();
        final setsCtrl = TextEditingController(text: '3');
        final repsCtrl = TextEditingController(text: '8');
        final weightCtrl = TextEditingController();
        final notesCtrl = TextEditingController();

        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 8,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Übung hinzufügen', style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 12),
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    hintText: 'z.B. Bankdrücken, Kniebeuge …',
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Bitte Namen eingeben';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: setsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Sets'),
                        validator: (v) {
                          final n = int.tryParse((v ?? '').trim());
                          if (n == null || n <= 0) return '—';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: repsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Reps'),
                        validator: (v) {
                          final n = int.tryParse((v ?? '').trim());
                          if (n == null || n <= 0) return '—';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: weightCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Gewicht (kg, optional)',
                    hintText: 'z.B. 60',
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: notesCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notizen (optional)',
                    hintText: 'z.B. Tempo 3-1-1',
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () {
                    final ok = formKey.currentState?.validate() ?? false;
                    if (!ok) return;

                    final sets = int.parse(setsCtrl.text.trim());
                    final reps = int.parse(repsCtrl.text.trim());
                    final weightRaw = weightCtrl.text.trim();
                    final weight = weightRaw.isEmpty ? null : double.tryParse(weightRaw);
                    final notes = notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim();

                    Navigator.of(ctx).pop(
                      WorkoutExercise(
                        id: const Uuid().v4(),
                        name: nameCtrl.text.trim(),
                        sets: sets,
                        reps: reps,
                        weightKg: weight,
                        notes: notes,
                      ),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Hinzufügen'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(null),
                  child: const Text('Abbrechen'),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (created == null) return;
    setState(() => _exercises.add(created));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Workout erstellen'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Speichern'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Details',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _nameCtrl,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Name',
                          hintText: 'z.B. Ganzkörper, Push, Pull …',
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Bitte gib einen Namen ein';
                          }
                          if (v.trim().length < 3) {
                            return 'Bitte mindestens 3 Zeichen';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Dauer',
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text('$_minutes min'),
                            ),
                            IconButton(
                              tooltip: 'Minus',
                              onPressed: _minutes <= 1
                                  ? null
                                  : () => setState(() => _minutes -= 1),
                              icon: const Icon(Icons.remove_circle_outline),
                            ),
                            IconButton(
                              tooltip: 'Plus',
                              onPressed: () => setState(() => _minutes += 1),
                              icon: const Icon(Icons.add_circle_outline),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _notesCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Notizen (optional)',
                          hintText: 'z.B. Fokus, PR, Technik-Cues …',
                        ),
                        minLines: 3,
                        maxLines: 6,
                      ),
                    ],
                  ),
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
                    Row(
                      children: [
                        const Icon(Icons.fitness_center),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Übungen',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _saving ? null : _addExercise,
                          icon: const Icon(Icons.add),
                          label: const Text('Hinzufügen'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_exercises.isEmpty)
                      Text(
                        'Füge ein paar Übungen hinzu (Sets/Reps/Gewicht).',
                        style: Theme.of(context).textTheme.bodyMedium,
                      )
                    else
                      for (final e in _exercises)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(e.name),
                          subtitle: Text(
                            '${e.sets}×${e.reps}${e.weightKg == null ? '' : ' • ${e.weightKg} kg'}',
                          ),
                          trailing: IconButton(
                            tooltip: 'Entfernen',
                            onPressed: _saving
                                ? null
                                : () => setState(() => _exercises.remove(e)),
                            icon: const Icon(Icons.close),
                          ),
                        ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: const Icon(Icons.save),
              label: const Text('Workout speichern'),
            ),
          ],
        ),
      ),
    );
  }
}
