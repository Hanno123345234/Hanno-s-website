import 'package:flutter/material.dart';

import 'basic_info_controller.dart';

class BasicInfoScreen extends StatefulWidget {
  const BasicInfoScreen({super.key, required this.controller});

  final BasicInfoController controller;

  @override
  State<BasicInfoScreen> createState() => _BasicInfoScreenState();
}

class _BasicInfoScreenState extends State<BasicInfoScreen> {
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

  String _genderLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'Männlich';
      case Gender.female:
        return 'Weiblich';
      case Gender.diverse:
        return 'Divers';
      case Gender.unspecified:
        return 'Keine Angabe';
    }
  }

  String _experienceLabel(TrainingExperience e) {
    switch (e) {
      case TrainingExperience.untrained:
        return 'Untrainiert';
      case TrainingExperience.beginner:
        return 'Einsteiger';
      case TrainingExperience.intermediate:
        return 'Fortgeschritten';
      case TrainingExperience.advanced:
        return 'Sehr erfahren';
    }
  }

  Future<void> _pickGender() async {
    final selected = await showModalBottomSheet<Gender>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Text('Geschlecht', style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 8),
              RadioGroup<Gender>(
                groupValue: widget.controller.gender,
                onChanged: (v) => Navigator.of(ctx).pop(v),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final g in Gender.values)
                      RadioListTile<Gender>(
                        value: g,
                        title: Text(_genderLabel(g)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (selected != null) {
      await widget.controller.setGender(selected);
    }
  }

  Future<void> _pickExperience() async {
    final selected = await showModalBottomSheet<TrainingExperience>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Text('Erfahrung', style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 8),
              RadioGroup<TrainingExperience>(
                groupValue: widget.controller.experience,
                onChanged: (v) => Navigator.of(ctx).pop(v),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final e in TrainingExperience.values)
                      RadioListTile<TrainingExperience>(
                        value: e,
                        title: Text(_experienceLabel(e)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (selected != null) {
      await widget.controller.setExperience(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Grundangaben'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fertig'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.wc_outlined),
                  title: const Text('Geschlecht'),
                  trailing: Text(
                    _genderLabel(widget.controller.gender),
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  onTap: _pickGender,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.fitness_center_outlined),
                  title: const Text('Erfahrung'),
                  trailing: Text(
                    _experienceLabel(widget.controller.experience),
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  onTap: _pickExperience,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.help_outline),
              title: const Text('Warum fragen wir das?'),
              subtitle: const Text(
                'Optional: Damit Empfehlungen und Vorschläge besser zu dir passen. Du kannst es jederzeit ändern.',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
