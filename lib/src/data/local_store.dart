import 'package:shared_preferences/shared_preferences.dart';

/// Tiny wrapper around SharedPreferences so we can swap to Firebase later.
class LocalStore {
  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  Future<String?> getString(String key) async {
    await init();
    return _prefs!.getString(key);
  }

  Future<void> setString(String key, String value) async {
    await init();
    await _prefs!.setString(key, value);
  }

  Future<void> remove(String key) async {
    await init();
    await _prefs!.remove(key);
  }
}
