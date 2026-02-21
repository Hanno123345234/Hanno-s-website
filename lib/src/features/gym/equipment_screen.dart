import 'package:flutter/material.dart';

import 'gym_controller.dart';

class EquipmentScreen extends StatefulWidget {
  const EquipmentScreen({super.key, required this.controller});

  final GymController controller;

  @override
  State<EquipmentScreen> createState() => _EquipmentScreenState();
}

class _EquipmentScreenState extends State<EquipmentScreen> {
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

  @override
  Widget build(BuildContext context) {
    final equipment = widget.controller.equipment;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Equipment'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Column(
              children: [
                for (final entry in equipment.entries) ...[
                  SwitchListTile(
                    value: entry.value,
                    onChanged: (v) => widget.controller.setEquipment(entry.key, v),
                    title: Text(entry.key),
                  ),
                  if (entry.key != equipment.entries.last.key) const Divider(height: 1),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
