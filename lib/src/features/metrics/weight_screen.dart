import 'package:flutter/material.dart';

import 'weight_controller.dart';

class WeightScreen extends StatefulWidget {
  const WeightScreen({super.key, required this.controller});

  final WeightController controller;

  @override
  State<WeightScreen> createState() => _WeightScreenState();
}

class _WeightScreenState extends State<WeightScreen> {
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
      isScrollControlled: true,
      showDragHandle: true,
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
              Text('Messwert hinzufügen', style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Körpergewicht (kg)',
                  hintText: 'z.B. 72.5',
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
                      const SnackBar(content: Text('Bitte gültiges Gewicht eingeben.')),
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
      await widget.controller.add(kg);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gespeichert')),
      );
    }
  }

  String _formatDate(int ms) {
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    final d = dt.day.toString().padLeft(2, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final y = dt.year.toString();
    return '$d.$m.$y';
  }

  @override
  Widget build(BuildContext context) {
    final latest = widget.controller.latest;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Körpergewicht'),
        actions: [
          IconButton(
            tooltip: 'Messwert hinzufügen',
            onPressed: _add,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.monitor_weight_outlined),
              title: const Text('Aktuell'),
              subtitle: Text(latest == null ? '—' : _formatDate(latest.createdAtMs)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    latest == null ? '—' : '${latest.kg.toStringAsFixed(1)} kg',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.add_circle_outline),
                ],
              ),
              onTap: _add,
            ),
          ),
          const SizedBox(height: 12),
          Text('Verlauf', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (widget.controller.entries.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Noch keine Messwerte.'),
              ),
            ),
          for (final e in widget.controller.entries)
            Card(
              child: ListTile(
                title: Text('${e.kg.toStringAsFixed(1)} kg'),
                subtitle: Text(_formatDate(e.createdAtMs)),
                trailing: IconButton(
                  tooltip: 'Löschen',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Messwert löschen?'),
                        content: Text('${e.kg.toStringAsFixed(1)} kg (${_formatDate(e.createdAtMs)})'),
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
                      await widget.controller.deleteAt(e.createdAtMs);
                    }
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
