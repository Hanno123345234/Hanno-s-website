import 'dart:math';

import 'package:flutter/foundation.dart';

const Map<String, List<String>> _categoryWords = {
  'Orte': <String>[
    'Quarantänestation',
    'Leuchtturmspitze',
    'Unterwasserhöhle',
    'Raumstation',
    'Vulkaninsel',
    'Gletscherplateau',
  ],
  'Berufe': <String>[
    'Forensiker',
    'Pilotin',
    'Neurochirurg',
    'Astronautin',
    'Archäologe',
    'Tiefseetaucherin',
  ],
  'Dinge': <String>[
    'Seismograf',
    'Mikroskop',
    'Satellitenschüssel',
    'Schweißgerät',
    'Hologrammprojektor',
    'Nachtkamera',
  ],
  'Tiere': <String>[
    'Axolotl',
    'Schneeleopard',
    'Manta-Rochen',
    'Komodowaran',
    'Kolibri',
    'Oktopus',
  ],
  'Essen': <String>[
    'Crème brûlée',
    'Risotto',
    'Tiramisu',
    'Paella',
    'Ramen',
    'Gnocchi',
  ],
};

class ImpostorController extends ChangeNotifier {
  ImpostorController({
    List<String>? initialPlayers,
  }) : _players = List<String>.from(
          initialPlayers ??
              <String>[
                'Hanno',
                'Elle',
                'Cristtine',
                'Fin',
                'Papa',
                'Steffen',
                'Opa der breite',
              ],
        );

  final List<String> _players;
  int _impostorCount = 1;
  bool _showHints = true;
  bool _timeLimitEnabled = false;
  String _selectedCategory = _categoryWords.keys.first;

  List<ImpostorCard>? _sessionCards;

  List<String> get players => List<String>.unmodifiable(_players);
  int get impostorCount => _impostorCount;
  bool get showHints => _showHints;
  bool get timeLimitEnabled => _timeLimitEnabled;
  List<String> get categories => List<String>.unmodifiable(_categoryWords.keys.toList());
  String get selectedCategory => _selectedCategory;

  int get maxImpostors {
    if (_players.length < 3) return 1;
    return max(1, min(6, _players.length ~/ 3));
  }

  bool isImpostorCountAllowed(int v) => v >= 1 && v <= maxImpostors;

  void setImpostorCount(int v) {
    final next = v.clamp(1, maxImpostors);
    if (next == _impostorCount) return;
    _impostorCount = next;
    notifyListeners();
  }

  void setShowHints(bool v) {
    if (v == _showHints) return;
    _showHints = v;
    notifyListeners();
  }

  void setTimeLimitEnabled(bool v) {
    if (v == _timeLimitEnabled) return;
    _timeLimitEnabled = v;
    notifyListeners();
  }

  void setCategory(String category) {
    if (!_categoryWords.containsKey(category)) return;
    if (category == _selectedCategory) return;
    _selectedCategory = category;
    notifyListeners();
  }

  void addPlayer(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    _players.add(trimmed);
    _impostorCount = _impostorCount.clamp(1, maxImpostors);
    notifyListeners();
  }

  void updatePlayer(int index, String name) {
    if (index < 0 || index >= _players.length) return;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    _players[index] = trimmed;
    notifyListeners();
  }

  void startSession({int? seed}) {
    final rng = Random(seed);

    final indices = List<int>.generate(_players.length, (i) => i);
    indices.shuffle(rng);

    final impostorIndices = indices.take(_impostorCount).toSet();

    final words = _categoryWords[_selectedCategory] ?? const <String>['Begriff'];
    final word = words[rng.nextInt(words.length)];

    _sessionCards = List<ImpostorCard>.generate(_players.length, (i) {
      final isImpostor = impostorIndices.contains(i);
      return ImpostorCard(
        playerName: _players[i],
        isImpostor: isImpostor,
        word: isImpostor ? null : word,
        category: _selectedCategory,
      );
    });

    notifyListeners();
  }

  List<ImpostorCard> get sessionCards => List<ImpostorCard>.unmodifiable(_sessionCards ?? const []);

  void clearSession() {
    _sessionCards = null;
    notifyListeners();
  }
}

class ImpostorCard {
  const ImpostorCard({
    required this.playerName,
    required this.isImpostor,
    required this.word,
    required this.category,
  });

  final String playerName;
  final bool isImpostor;
  final String? word;
  final String category;
}
