import 'package:flutter/material.dart';

import 'equipment_screen.dart';
import 'gym_controller.dart';
import 'weights_screen.dart';

class GymScreen extends StatelessWidget {
  const GymScreen({super.key, required this.controller});

  final GymController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final selectedCount = controller.equipment.values.where((v) => v).length;
        final weightsCount = controller.availableWeights.length;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Mein Gym'),
          ),
          body: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.handyman_outlined),
                  title: const Text('Equipment'),
                  subtitle: Text('$selectedCount ausgewählt'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => EquipmentScreen(controller: controller),
                      ),
                    );
                  },
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.scale_outlined),
                  title: const Text('Gewichte'),
                  subtitle: Text('$weightsCount Einträge'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => WeightsScreen(controller: controller),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('Warum?'),
                  subtitle: const Text(
                    'Damit dir nur Übungen angezeigt werden, die du auch machen kannst.',
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
