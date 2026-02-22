import 'package:flutter/material.dart';

import 'impostor_controller.dart';

class CardRevealScreen extends StatefulWidget {
  const CardRevealScreen({super.key, required this.controller});

  final ImpostorController controller;

  @override
  State<CardRevealScreen> createState() => _CardRevealScreenState();
}

class _CardRevealScreenState extends State<CardRevealScreen> {
  int _index = 0;
  bool _revealed = false;

  @override
  void initState() {
    super.initState();
    if (widget.controller.sessionCards.isEmpty) {
      widget.controller.startSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final cards = widget.controller.sessionCards;

    if (cards.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final card = cards[_index];

    return Scaffold(
      backgroundColor: cs.primary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: cs.onPrimary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            widget.controller.clearSession();
            Navigator.of(context).pop();
          },
        ),
        title: Text(card.playerName),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          child: Column(
            children: [
              Expanded(
                child: Card(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => setState(() => _revealed = true),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  cs.primaryContainer,
                                  cs.surface,
                                ],
                              ),
                            ),
                          ),
                        ),
                        Positioned.fill(
                          child: Center(
                            child: _revealed
                                ? Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        card.isImpostor
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                        size: 42,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        card.isImpostor ? 'Impostor' : (card.word ?? ''),
                                        textAlign: TextAlign.center,
                                        style: theme.textTheme.displaySmall?.copyWith(
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ],
                                  )
                                : Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.keyboard_arrow_up, size: 52),
                                      const SizedBox(height: 12),
                                      Text(
                                        'Karte aufdecken',
                                        style: theme.textTheme.headlineSmall?.copyWith(
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (_revealed) ...[
                const SizedBox(height: 4),
                FilledButton(
                  onPressed: () {
                    if (_index + 1 >= cards.length) {
                      widget.controller.clearSession();
                      Navigator.of(context).pop();
                      return;
                    }
                    setState(() {
                      _index++;
                      _revealed = false;
                    });
                  },
                  child: Text(_index + 1 >= cards.length ? 'Fertig' : 'Weitergeben'),
                ),
                const SizedBox(height: 12),
                Text(
                  _index + 1 >= cards.length
                      ? 'Alle Karten verteilt.'
                      : 'Gerät an den nächsten Spieler weitergeben',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: cs.onPrimary.withAlpha(230),
                  ),
                ),
              ] else ...[
                Text(
                  'Tippe, um deine Karte aufzudecken.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: cs.onPrimary.withAlpha(230),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
