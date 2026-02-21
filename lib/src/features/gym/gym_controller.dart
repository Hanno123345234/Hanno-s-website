import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../data/local_store.dart';

class GymController extends ChangeNotifier {
  GymController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _equipmentKey = 'gym.equipment';
  static const _weightsKey = 'gym.weights';

  bool _isReady = false;

  final Map<String, bool> _equipment = <String, bool>{
    'Kurzhanteln': true,
    'Langhantel': false,
    'Bank': false,
    'Klimmzugstange': false,
    'Bänder': false,
    'Maschinen': false,
  };

  final List<double> _availableWeights = <double>[
    2.5,
    5,
    7.5,
    10,
    12.5,
    15,
    20,
    25,
    30,
  ];

  bool get isReady => _isReady;
  Map<String, bool> get equipment => Map<String, bool>.unmodifiable(_equipment);
  List<double> get availableWeights => List<double>.unmodifiable(_availableWeights);

  Future<void> load() async {
    final rawEq = await _store.getString(_equipmentKey);
    final decodedEq = _decodeMap(rawEq);
    if (decodedEq != null) {
      _equipment
        ..clear()
        ..addAll(decodedEq.map((k, v) => MapEntry(k, v is bool ? v : false)));
    }

    final rawW = await _store.getString(_weightsKey);
    final decodedW = _decodeList(rawW);
    if (decodedW != null) {
      _availableWeights
        ..clear()
        ..addAll(decodedW.whereType<num>().map((n) => n.toDouble()));
      _availableWeights.sort();
    }

    _isReady = true;
    notifyListeners();
  }

  Future<void> setEquipment(String name, bool value) async {
    _equipment[name] = value;
    await _persistEquipment();
    notifyListeners();
  }

  Future<void> addWeight(double kg) async {
    final v = double.parse(kg.toStringAsFixed(1));
    if (v <= 0) throw StateError('Gewicht muss > 0 sein');
    if (_availableWeights.any((e) => (e - v).abs() < 0.01)) return;
    _availableWeights.add(v);
    _availableWeights.sort();
    await _persistWeights();
    notifyListeners();
  }

  Future<void> removeWeight(double kg) async {
    _availableWeights.removeWhere((e) => (e - kg).abs() < 0.01);
    await _persistWeights();
    notifyListeners();
  }

  Future<void> _persistEquipment() async {
    await _store.setString(_equipmentKey, jsonEncode(_equipment));
  }

  Future<void> _persistWeights() async {
    await _store.setString(_weightsKey, jsonEncode(_availableWeights));
  }

  Map<String, Object?>? _decodeMap(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      return (jsonDecode(raw) as Map).cast<String, Object?>();
    } catch (_) {
      return null;
    }
  }

  List<Object?>? _decodeList(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      return (jsonDecode(raw) as List).cast<Object?>();
    } catch (_) {
      return null;
    }
  }
}
