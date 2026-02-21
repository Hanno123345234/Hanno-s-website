import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../data/local_store.dart';

class WeightEntry {
  const WeightEntry({
    required this.createdAtMs,
    required this.kg,
  });

  final int createdAtMs;
  final double kg;

  Map<String, Object?> toJson() => {
        'createdAtMs': createdAtMs,
        'kg': kg,
      };

  static WeightEntry fromJson(Map<String, Object?> json) {
    return WeightEntry(
      createdAtMs: (json['createdAtMs'] as num).toInt(),
      kg: (json['kg'] as num).toDouble(),
    );
  }
}

class WeightController extends ChangeNotifier {
  WeightController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _key = 'metrics.weight.entries';

  bool _isReady = false;
  final List<WeightEntry> _entries = <WeightEntry>[];

  bool get isReady => _isReady;
  List<WeightEntry> get entries => List<WeightEntry>.unmodifiable(_entries);

  WeightEntry? get latest => _entries.isEmpty ? null : _entries.first;

  Future<void> load() async {
    final raw = await _store.getString(_key);
    _entries
      ..clear()
      ..addAll(_decode(raw));
    _entries.sort((a, b) => b.createdAtMs.compareTo(a.createdAtMs));

    _isReady = true;
    notifyListeners();
  }

  Future<void> add(double kg, {DateTime? at}) async {
    final v = double.parse(kg.toStringAsFixed(1));
    if (v <= 0) throw StateError('Gewicht muss > 0 sein');

    final entry = WeightEntry(
      createdAtMs: (at ?? DateTime.now()).millisecondsSinceEpoch,
      kg: v,
    );

    _entries.insert(0, entry);
    await _persist();
    notifyListeners();
  }

  Future<void> deleteAt(int createdAtMs) async {
    _entries.removeWhere((e) => e.createdAtMs == createdAtMs);
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final raw = jsonEncode(_entries.map((e) => e.toJson()).toList(growable: false));
    await _store.setString(_key, raw);
  }

  List<WeightEntry> _decode(String? raw) {
    if (raw == null || raw.isEmpty) return const <WeightEntry>[];
    try {
      final list = (jsonDecode(raw) as List).cast<Object?>();
      return list
          .whereType<Map>()
          .map((m) => WeightEntry.fromJson(m.cast<String, Object?>()))
          .toList(growable: false);
    } catch (_) {
      return const <WeightEntry>[];
    }
  }
}
