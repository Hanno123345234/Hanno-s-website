import 'package:flutter/material.dart';

import 'impostor_controller.dart';

class CategoryScreen extends StatelessWidget {
  const CategoryScreen({super.key, required this.controller});

  final ImpostorController controller;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: cs.primary,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            foregroundColor: cs.onPrimary,
            title: const Text('Kategorien'),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                Card(
                  color: cs.surface,
                  child: Column(
                    children: [
                      for (var i = 0; i < controller.categories.length; i++) ...[
                        RadioListTile<String>(
                          value: controller.categories[i],
                          groupValue: controller.selectedCategory,
                          title: Text(controller.categories[i]),
                          subtitle: const Text('Schwierige Begriffe'),
                          onChanged: (v) {
                            if (v == null) return;
                            controller.setCategory(v);
                          },
                        ),
                        if (i != controller.categories.length - 1) const Divider(height: 0),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Es wird pro Runde ein Begriff aus der gewählten Kategorie gezogen.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: cs.onPrimary.withAlpha(230),
                      ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
