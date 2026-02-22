import 'package:flutter/material.dart';

import 'card_reveal_screen.dart';
import 'impostor_controller.dart';
import 'impostor_count_screen.dart';
import 'players_screen.dart';

class ImpostorSetupScreen extends StatefulWidget {
  const ImpostorSetupScreen({super.key});

  @override
  State<ImpostorSetupScreen> createState() => _ImpostorSetupScreenState();
}

class _ImpostorSetupScreenState extends State<ImpostorSetupScreen> {
  final ImpostorController _controller = ImpostorController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: cs.primary,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            foregroundColor: cs.onPrimary,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            actions: [
              IconButton(
                tooltip: 'Favorit',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Kommt bald.')),
                  );
                },
                icon: const Icon(Icons.favorite_border),
              ),
              IconButton(
                tooltip: 'Hilfe',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Kommt bald.')),
                  );
                },
                icon: const Icon(Icons.help_outline),
              ),
            ],
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                Text(
                  'Impostor',
                  style: theme.textTheme.displayLarge?.copyWith(
                    color: cs.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'von Hannes & Jeremy',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: cs.onPrimary.withAlpha(220),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  color: cs.surface,
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Text('☝️', style: TextStyle(fontSize: 18)),
                        title: const Text('Spieler'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${_controller.players.length}',
                              style: TextStyle(color: cs.onSurfaceVariant),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.chevron_right),
                          ],
                        ),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PlayersScreen(controller: _controller),
                            ),
                          );
                        },
                      ),
                      const Divider(height: 0),
                      ListTile(
                        leading: const Text('👻', style: TextStyle(fontSize: 18)),
                        title: const Text('Impostor'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${_controller.impostorCount}',
                              style: TextStyle(color: cs.onSurfaceVariant),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.chevron_right),
                          ],
                        ),
                        onTap: () async {
                          final selected = await Navigator.of(context).push<int>(
                            MaterialPageRoute(
                              builder: (_) => ImpostorCountScreen(controller: _controller),
                            ),
                          );
                          if (selected != null) _controller.setImpostorCount(selected);
                        },
                      ),
                      const Divider(height: 0),
                      SwitchListTile(
                        secondary: const Text('🔎', style: TextStyle(fontSize: 18)),
                        title: const Text('Hinweise für Impostor'),
                        value: _controller.showHints,
                        onChanged: _controller.setShowHints,
                      ),
                      const Divider(height: 0),
                      ListTile(
                        leading: const Text('🐼', style: TextStyle(fontSize: 18)),
                        title: const Text('Kategorien'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Neue Begriff…',
                              style: TextStyle(color: cs.onSurfaceVariant),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.chevron_right),
                          ],
                        ),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Kommt bald.')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  color: cs.surface,
                  child: SwitchListTile(
                    secondary: const Text('⏱️', style: TextStyle(fontSize: 18)),
                    title: const Text('Zeitlimit'),
                    value: _controller.timeLimitEnabled,
                    onChanged: _controller.setTimeLimitEnabled,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Legt die Spielregeln fest. Danach zieht jeder\nseine Karte – und das Misstrauen beginnt.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: cs.onPrimary.withAlpha(230),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _controller.players.isEmpty
                      ? null
                      : () {
                          _controller.startSession();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => CardRevealScreen(controller: _controller),
                            ),
                          );
                        },
                  child: const Text('Spiel starten'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
