import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../../data/local_store.dart';
import '../../domain/models.dart';

class AuthController extends ChangeNotifier {
  AuthController({required LocalStore store}) : _store = store;

  final LocalStore _store;

  static const bool _devQuickLoginEnabled = bool.fromEnvironment(
    'DEV_QUICK_LOGIN',
    defaultValue: false,
  );

  static const _userKey = 'auth.currentUser';
  static const _pendingEmailKey = 'auth.pendingEmail';
  static const _pendingCodeKey = 'auth.pendingCode';

  bool _isReady = false;
  AppUser? _currentUser;

  String? _pendingEmail;
  bool _codeSent = false;
  String? _devLastCode; // for MVP visibility

  bool get isReady => _isReady;
  AppUser? get currentUser => _currentUser;
  bool get codeSent => _codeSent;
  String? get pendingEmail => _pendingEmail;
  String? get devLastCode => _devLastCode;

  Future<void> load() async {
    final raw = await _store.getString(_userKey);
    if (raw != null) {
      _currentUser = AppUser.fromJson(decodeJsonMap(raw));
    }

    _pendingEmail = await _store.getString(_pendingEmailKey);
    _codeSent = _pendingEmail != null;

    _isReady = true;
    notifyListeners();
  }

  /// Email + code login (MVP).
  ///
  /// In this local-only MVP we generate a 6-digit code and store it locally.
  /// For production: replace this with a backend that emails the code.
  Future<void> requestEmailCode(String email) async {
    final normalized = email.trim().toLowerCase();
    if (!normalized.contains('@') || !normalized.contains('.')) {
      throw StateError('Bitte eine gültige Email eingeben');
    }

    final code = _generateOtp();
    _pendingEmail = normalized;
    _codeSent = true;
    _devLastCode = code;

    await _store.setString(_pendingEmailKey, normalized);
    await _store.setString(_pendingCodeKey, code);
    notifyListeners();
  }

  Future<void> verifyEmailCode(String code) async {
    final entered = code.trim();
    final pendingEmail = _pendingEmail;
    if (pendingEmail == null) throw StateError('Kein Code angefordert');

    final expected = await _store.getString(_pendingCodeKey);
    if (expected == null) throw StateError('Kein Code angefordert');
    if (entered != expected) throw StateError('Code ist falsch');

    final id = const Uuid().v4();
    final displayName = pendingEmail.split('@').first;

    _currentUser = AppUser(id: id, email: pendingEmail, displayName: displayName);
    await _store.setString(_userKey, encodeJson(_currentUser!.toJson()));

    await _store.remove(_pendingEmailKey);
    await _store.remove(_pendingCodeKey);
    _pendingEmail = null;
    _codeSent = false;
    notifyListeners();
  }

  Future<void> devQuickSignIn({String displayName = 'Hanno'}) async {
    if (!(kDebugMode || _devQuickLoginEnabled)) {
      throw StateError('Dev quick login ist deaktiviert');
    }

    final id = const Uuid().v4();
    final email = '${displayName.trim().toLowerCase()}@dev.local';

    _currentUser = AppUser(id: id, email: email, displayName: displayName.trim());
    await _store.setString(_userKey, encodeJson(_currentUser!.toJson()));

    await _store.remove(_pendingEmailKey);
    await _store.remove(_pendingCodeKey);
    _pendingEmail = null;
    _codeSent = false;
    _devLastCode = null;
    notifyListeners();
  }

  Future<void> signOut() async {
    _currentUser = null;
    await _store.remove(_userKey);
    await _store.remove(_pendingEmailKey);
    await _store.remove(_pendingCodeKey);
    _pendingEmail = null;
    _codeSent = false;
    notifyListeners();
  }

  /// Short invite code, WhatsApp friendly.
  /// Not cryptographically secure.
  String generateInviteCode({int length = 6}) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random();
    return List.generate(length, (_) => alphabet[r.nextInt(alphabet.length)]).join();
  }

  String _generateOtp() {
    final r = Random();
    final v = r.nextInt(1000000);
    return v.toString().padLeft(6, '0');
  }
}
