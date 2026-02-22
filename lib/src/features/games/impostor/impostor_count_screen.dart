import 'package:flutter/material.dart';

import 'impostor_controller.dart';

class ImpostorCountScreen extends StatelessWidget {
  const ImpostorCountScreen({super.key, required this.controller});

  final ImpostorController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: cs.primary,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            foregroundColor: cs.onPrimary,
            title: const Text('Impostor'),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                Card(
                  color: cs.surface,
                  child: Column(
                    children: [
                      for (var v = 1; v <= 6; v++) ...[
                        ListTile(
                          leading: CircleAvatar(
                            backgroundColor: cs.surfaceContainerHighest,
                            child: Text('$v'),
                          ),
                          title: Text('$v Impostor'),
                          trailing: controller.impostorCount == v
                              ? Icon(Icons.check, color: cs.primary)
                              : null,
                          enabled: controller.isImpostorCountAllowed(v),
                          onTap: controller.isImpostorCountAllowed(v)
                              ? () => Navigator.of(context).pop(v)
                              : null,
                        ),
                        if (v != 6) const Divider(height: 0),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Entscheide, wie viele Impostor sich\neinschleichen sollen. Die erlaubte Anzahl hängt\nvon der Gesamtzahl der Spieler ab.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
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
