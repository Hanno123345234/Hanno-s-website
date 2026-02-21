import 'package:flutter/material.dart';

import '../../data/local_store.dart';

class AppSettingsController extends ChangeNotifier {
  AppSettingsController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const _themeKey = 'settings.themeMode';
  static const _localeKey = 'settings.locale';

  bool _isReady = false;
  ThemeMode _themeMode = ThemeMode.system;
  Locale? _locale;

  bool get isReady => _isReady;
  ThemeMode get themeMode => _themeMode;
  Locale? get locale => _locale;

  Future<void> load() async {
    final rawTheme = await _store.getString(_themeKey);
    _themeMode = _parseThemeMode(rawTheme) ?? ThemeMode.system;

    final rawLocale = await _store.getString(_localeKey);
    _locale = (rawLocale == null || rawLocale.isEmpty) ? null : Locale(rawLocale);

    _isReady = true;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    await _store.setString(_themeKey, _themeMode.name);
    notifyListeners();
  }

  Future<void> setLocale(Locale? locale) async {
    _locale = locale;
    await _store.setString(_localeKey, locale?.languageCode ?? '');
    notifyListeners();
  }

  ThemeMode? _parseThemeMode(String? v) {
    if (v == null || v.isEmpty) return null;
    for (final mode in ThemeMode.values) {
      if (mode.name == v) return mode;
    }
    return null;
  }
}
