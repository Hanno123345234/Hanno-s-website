import 'package:flutter/material.dart';
import 'dart:async';

import 'impostor_controller.dart';

enum _RoundPhase { reveal, discussion, result }

class CardRevealScreen extends StatefulWidget {
  const CardRevealScreen({super.key, required this.controller});

  final ImpostorController controller;

  @override
  State<CardRevealScreen> createState() => _CardRevealScreenState();
}

class _CardRevealScreenState extends State<CardRevealScreen> {
  int _index = 0;
  bool _revealed = false;
  _RoundPhase _phase = _RoundPhase.reveal;
  Timer? _timer;
  int _remainingSeconds = 5 * 60;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

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
    final impostors = cards.where((c) => c.isImpostor).map((c) => c.playerName).toList();

    if (_phase == _RoundPhase.discussion) {
      return Scaffold(
        backgroundColor: cs.primary,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: cs.onPrimary,
          centerTitle: true,
          title: const Text('Impostor'),
          actions: [
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                widget.controller.clearSession();
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Column(
              children: [
                const Spacer(),
                Text(
                  'Diskussion läuft!',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.displaySmall?.copyWith(
                    color: cs.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Wenn ihr denkt, den Impostor gefunden zu haben, drückt auf den Button.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: cs.onPrimary.withAlpha(240),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 28),
                Icon(Icons.person, size: 68, color: cs.onPrimary.withAlpha(240)),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () => setState(() => _phase = _RoundPhase.result),
                  style: FilledButton.styleFrom(
                    backgroundColor: cs.surface,
                    foregroundColor: cs.onSurface,
                    minimumSize: const Size(260, 56),
                  ),
                  child: const Text('Wir haben den Impostor gefunden'),
                ),
                const Spacer(),
                Text(
                  widget.controller.timeLimitEnabled
                      ? 'Diskussionszeit läuft: ${_formatSeconds(_remainingSeconds)}'
                      : 'Für dieses Spiel gibt es keinen Timer. Deckt den Impostor auf, sobald ihr euch einig seid.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    color: cs.onPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_phase == _RoundPhase.result) {
      final impostorText = impostors.length == 1
          ? 'Der Impostor ist ${impostors.first}'
          : 'Die Impostor sind ${impostors.join(', ')}';

      return Scaffold(
        backgroundColor: cs.primary,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: cs.onPrimary,
          centerTitle: true,
          title: const Text('Impostor'),
          actions: [
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                widget.controller.clearSession();
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    impostorText,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.displaySmall?.copyWith(
                      color: cs.onPrimary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 22),
                  FilledButton(
                    onPressed: () {
                      widget.controller.startSession();
                      _timer?.cancel();
                      setState(() {
                        _index = 0;
                        _revealed = false;
                        _phase = _RoundPhase.reveal;
                        _remainingSeconds = 5 * 60;
                      });
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: cs.surface,
                      foregroundColor: cs.onSurface,
                      minimumSize: const Size(220, 56),
                    ),
                    child: const Text('Neu starten'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

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
                                        card.isImpostor
                                            ? (widget.controller.showHints
                                                ? 'Impostor\nKategorie: ${card.category}'
                                                : 'Impostor')
                                            : (card.word ?? ''),
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
                      _startDiscussionPhase();
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
                      ? 'Alle waren dran.'
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

  void _startDiscussionPhase() {
    _timer?.cancel();
    setState(() {
      _phase = _RoundPhase.discussion;
      _remainingSeconds = 5 * 60;
    });

    if (!widget.controller.timeLimitEnabled) return;

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_remainingSeconds <= 0) {
        t.cancel();
        return;
      }
      setState(() {
        _remainingSeconds--;
      });
    });
  }

  String _formatSeconds(int total) {
    final minutes = total ~/ 60;
    final seconds = total % 60;
    final s = seconds < 10 ? '0$seconds' : '$seconds';
    return '$minutes:$s';
  }
}
