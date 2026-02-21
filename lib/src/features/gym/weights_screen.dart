import 'package:flutter/material.dart';

import 'gym_controller.dart';

class WeightsScreen extends StatefulWidget {
  const WeightsScreen({super.key, required this.controller});

  final GymController controller;

  @override
  State<WeightsScreen> createState() => _WeightsScreenState();
}

class _WeightsScreenState extends State<WeightsScreen> {
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

  Future<void> _add() async {
    final kg = await showModalBottomSheet<double>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        final ctrl = TextEditingController();
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
              Text('Gewicht hinzufügen', style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'kg',
                  hintText: 'z.B. 17.5',
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  final raw = ctrl.text.trim().replaceAll(',', '.');
                  final v = double.tryParse(raw);
                  if (v == null || v <= 0) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Bitte gültige Zahl eingeben.')),
                    );
                    return;
                  }
                  Navigator.of(ctx).pop(v);
                },
                child: const Text('Speichern'),
              ),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Abbrechen'),
              ),
            ],
          ),
        );
      },
    );

    if (kg != null) {
      await widget.controller.addWeight(kg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final weights = widget.controller.availableWeights;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gewichte'),
        actions: [
          IconButton(
            tooltip: 'Hinzufügen',
            onPressed: _add,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Column(
              children: [
                for (final w in weights) ...[
                  ListTile(
                    title: Text('${w.toStringAsFixed(1)} kg'),
                    trailing: IconButton(
                      tooltip: 'Entfernen',
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: () => widget.controller.removeWeight(w),
                    ),
                  ),
                  if (w != weights.last) const Divider(height: 1),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
