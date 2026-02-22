import 'package:flutter/material.dart';

import 'impostor_controller.dart';

class PlayersScreen extends StatelessWidget {
  const PlayersScreen({super.key, required this.controller});

  final ImpostorController controller;

  Future<void> _editName(BuildContext context, {required int index, String? initial}) async {
    final c = TextEditingController(text: initial ?? '');
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(index < 0 ? 'Spieler hinzufügen' : 'Spieler bearbeiten'),
          content: TextField(
            controller: c,
            autofocus: true,
            decoration: const InputDecoration(hintText: 'Name'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Abbrechen'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(c.text),
              child: const Text('Speichern'),
            ),
          ],
        );
      },
    );

    if (name == null) return;
    if (index < 0) {
      controller.addPlayer(name);
    } else {
      controller.updatePlayer(index, name);
    }
  }

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
            title: const Text('Spieler'),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                Card(
                  color: cs.surface,
                  child: Column(
                    children: [
                      for (var i = 0; i < controller.players.length; i++) ...[
                        ListTile(
                          title: Text(controller.players[i]),
                          trailing: IconButton(
                            tooltip: 'Bearbeiten',
                            onPressed: () => _editName(
                              context,
                              index: i,
                              initial: controller.players[i],
                            ),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                          onTap: () => _editName(
                            context,
                            index: i,
                            initial: controller.players[i],
                          ),
                        ),
                        if (i != controller.players.length - 1) const Divider(height: 0),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => _editName(context, index: -1),
                  icon: const Icon(Icons.add),
                  label: const Text('Spieler hinzufügen'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
