import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../../data/local_store.dart';
import '../../domain/models.dart';
import '../../domain/streaks.dart';
import '../auth/auth_controller.dart';

class ChallengesController extends ChangeNotifier {
  ChallengesController({required LocalStore store, required AuthController auth})
      : _store = store,
        _auth = auth;

  final LocalStore _store;
  final AuthController _auth;

  bool _isReady = false;
  bool get isReady => _isReady;

  final List<Challenge> _challenges = [];
  final Map<String, Map<String, Membership>> _membershipsByChallenge = {};
  final Map<String, Map<String, DailyCheckin>> _checkinsByChallengeDateKey = {};

  List<Challenge> get challenges => List.unmodifiable(_challenges);

  static const _challengesKey = 'challenges.list';
  static String _membersKey(String challengeId) => 'challenge.$challengeId.members';
  static String _checkinsKey(String challengeId, String dateKey) =>
      'challenge.$challengeId.checkins.$dateKey';

  Future<void> load() async {
    final raw = await _store.getString(_challengesKey);
    if (raw != null) {
      final list = (jsonDecode(raw) as List).cast<Map>();
      _challenges
        ..clear()
        ..addAll(list.map((e) => Challenge.fromJson(e.cast<String, Object?>())));

      for (final c in _challenges) {
        await _loadMembers(c.id);
      }
    }
    _isReady = true;
    notifyListeners();
  }

  Future<void> _persistChallenges() async {
    await _store.setString(
      _challengesKey,
      encodeJson(_challenges.map((c) => c.toJson()).toList()),
    );
  }

  Future<void> _loadMembers(String challengeId) async {
    final raw = await _store.getString(_membersKey(challengeId));
    final map = <String, Membership>{};
    if (raw != null) {
      final decoded = decodeJsonMap(raw);
      for (final entry in decoded.entries) {
        map[entry.key] = Membership.fromJson((entry.value as Map).cast<String, Object?>());
      }
    }
    _membershipsByChallenge[challengeId] = map;
  }

  Future<void> _persistMembers(String challengeId) async {
    final map = _membershipsByChallenge[challengeId] ?? {};
    await _store.setString(
      _membersKey(challengeId),
      encodeJson(map.map((k, v) => MapEntry(k, v.toJson()))),
    );
  }

  Future<Map<String, DailyCheckin>> _loadCheckins(String challengeId, String dateKey) async {
    final key = _checkinsKey(challengeId, dateKey);
    final raw = await _store.getString(key);
    final map = <String, DailyCheckin>{};
    if (raw != null) {
      final decoded = decodeJsonMap(raw);
      for (final entry in decoded.entries) {
        map[entry.key] = DailyCheckin.fromJson((entry.value as Map).cast<String, Object?>());
      }
    }
    _checkinsByChallengeDateKey['$challengeId:$dateKey'] = map;
    return map;
  }

  Future<void> _persistCheckins(String challengeId, String dateKey) async {
    final map = _checkinsByChallengeDateKey['$challengeId:$dateKey'] ?? {};
    await _store.setString(
      _checkinsKey(challengeId, dateKey),
      encodeJson(map.map((k, v) => MapEntry(k, v.toJson()))),
    );
  }

  Challenge? findById(String id) {
    for (final c in _challenges) {
      if (c.id == id) return c;
    }
    return null;
  }

  Map<String, Membership> membershipsForChallenge(String challengeId) {
    return _membershipsByChallenge[challengeId] ?? const {};
  }

  Future<Challenge> createChallenge({
    required String name,
    required String iconKey,
    required String goalText,
    int? goalCount,
    required bool startTomorrow,
    required bool isEndless,
    required int durationDays,
    required int resetHourLocal,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');

    final id = const Uuid().v4();
    final inviteCode = widgetSafeInviteCode();

    final now = DateTime.now();
    final start = startTomorrow ? now.add(const Duration(days: 1)) : now;
    final startDateIso = '${start.year.toString().padLeft(4, '0')}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';

    final c = Challenge(
      id: id,
      name: name.trim(),
      ownerUserId: user.id,
      iconKey: iconKey,
      goalText: goalText.trim().isEmpty ? 'Habit' : goalText.trim(),
      goalCount: goalCount,
      startDateIso: startDateIso,
      durationDays: durationDays,
      isEndless: isEndless,
      resetHourLocal: resetHourLocal,
      inviteCode: inviteCode,
      createdAtMs: DateTime.now().millisecondsSinceEpoch,
    );

    _challenges.add(c);
    await _persistChallenges();

    // Auto-join owner.
    final members = _membershipsByChallenge.putIfAbsent(id, () => {});
    members[user.id] = Membership(
      challengeId: id,
      userId: user.id,
      joinedAtMs: DateTime.now().millisecondsSinceEpoch,
      currentStreak: 0,
      longestStreak: 0,
      lastCheckinDateKey: null,
      completionCount: 0,
    );
    await _persistMembers(id);

    notifyListeners();
    return c;
  }

  String widgetSafeInviteCode() => _auth.generateInviteCode();

  Challenge? findByInviteCode(String inviteCode) {
    final normalized = inviteCode.trim().toUpperCase();
    for (final c in _challenges) {
      if (c.inviteCode.toUpperCase() == normalized) return c;
    }
    return null;
  }

  Future<void> joinChallengeByCode(String inviteCode) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');

    final challenge = findByInviteCode(inviteCode);
    if (challenge == null) {
      throw StateError('Challenge not found (local MVP)');
    }

    final members = _membershipsByChallenge.putIfAbsent(challenge.id, () => {});
    if (!members.containsKey(user.id)) {
      members[user.id] = Membership(
        challengeId: challenge.id,
        userId: user.id,
        joinedAtMs: DateTime.now().millisecondsSinceEpoch,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckinDateKey: null,
        completionCount: 0,
      );
      await _persistMembers(challenge.id);
      notifyListeners();
    }
  }

  Future<DailyCheckin?> getTodayCheckin(String challengeId) async {
    final user = _auth.currentUser;
    if (user == null) return null;

    final challenge = _challenges.firstWhere((c) => c.id == challengeId);
    final dateKey = dateKeyForNow(nowLocal: DateTime.now(), resetHourLocal: challenge.resetHourLocal);
    final map = await _loadCheckins(challengeId, dateKey);
    return map[user.id];
  }

  Future<List<DailyCheckin>> getCheckinsForToday(String challengeId) async {
    final challenge = _challenges.firstWhere((c) => c.id == challengeId);
    final dateKey = dateKeyForNow(nowLocal: DateTime.now(), resetHourLocal: challenge.resetHourLocal);
    final map = await _loadCheckins(challengeId, dateKey);
    return map.values.toList();
  }

  Future<void> toggleCheckinToday({
    required String challengeId,
    required ProofType proofType,
    required String? comment,
    required String? emoji,
    int? timerSeconds,
    String? photoPath,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');

    final challenge = _challenges.firstWhere((c) => c.id == challengeId);
    final now = DateTime.now();
    final dateKey = dateKeyForNow(nowLocal: now, resetHourLocal: challenge.resetHourLocal);

    final checkins = await _loadCheckins(challengeId, dateKey);
    final existing = checkins[user.id];

    final members = _membershipsByChallenge.putIfAbsent(challengeId, () => {});
    final member = members[user.id];
    if (member == null) throw StateError('Not a member');

    if (existing != null) {
      // Undo allowed for today.
      checkins.remove(user.id);
      await _persistCheckins(challengeId, dateKey);

      // Keep streak as-is (simple MVP). Production: recompute from history.
      notifyListeners();
      return;
    }

    final checkin = DailyCheckin(
      challengeId: challengeId,
      userId: user.id,
      dateKey: dateKey,
      createdAtMs: now.millisecondsSinceEpoch,
      proofType: proofType,
      comment: comment?.trim().isEmpty == true ? null : comment?.trim(),
      emoji: emoji?.trim().isEmpty == true ? null : emoji?.trim(),
      timerSeconds: timerSeconds,
      photoPath: photoPath,
    );

    checkins[user.id] = checkin;
    await _persistCheckins(challengeId, dateKey);

    final yesterday = previousDateKey(dateKey);
    final newStreak = (member.lastCheckinDateKey == yesterday) ? member.currentStreak + 1 : 1;
    final newLongest = newStreak > member.longestStreak ? newStreak : member.longestStreak;

    members[user.id] = member.copyWith(
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCheckinDateKey: dateKey,
      completionCount: member.completionCount + 1,
    );
    await _persistMembers(challengeId);

    notifyListeners();
  }
}
