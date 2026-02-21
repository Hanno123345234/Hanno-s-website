import 'package:flutter/foundation.dart';

import '../../data/local_store.dart';

enum Gender { unspecified, male, female, diverse }

enum TrainingExperience { untrained, beginner, intermediate, advanced }

class BasicInfoController extends ChangeNotifier {
  BasicInfoController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _genderKey = 'profile.gender';
  static const _experienceKey = 'profile.experience';

  bool _isReady = false;
  Gender _gender = Gender.unspecified;
  TrainingExperience _experience = TrainingExperience.untrained;

  bool get isReady => _isReady;
  Gender get gender => _gender;
  TrainingExperience get experience => _experience;

  Future<void> load() async {
    final g = await _store.getString(_genderKey);
    _gender = _parseEnum(g, Gender.values) ?? Gender.unspecified;

    final e = await _store.getString(_experienceKey);
    _experience = _parseEnum(e, TrainingExperience.values) ?? TrainingExperience.untrained;

    _isReady = true;
    notifyListeners();
  }

  Future<void> setGender(Gender value) async {
    _gender = value;
    await _store.setString(_genderKey, value.name);
    notifyListeners();
  }

  Future<void> setExperience(TrainingExperience value) async {
    _experience = value;
    await _store.setString(_experienceKey, value.name);
    notifyListeners();
  }

  T? _parseEnum<T extends Enum>(String? raw, List<T> values) {
    if (raw == null || raw.isEmpty) return null;
    for (final v in values) {
      if (v.name == raw) return v;
    }
    return null;
  }
}
