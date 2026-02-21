import 'dart:convert';

import 'package:collection/collection.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.displayName,
  });

  final String id;
  final String email;
  final String displayName;

  Map<String, Object?> toJson() => {
        'id': id,
      'email': email,
        'displayName': displayName,
      };

  static AppUser fromJson(Map<String, Object?> json) {
    return AppUser(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String,
    );
  }
}

class Challenge {
  const Challenge({
    required this.id,
    required this.name,
    required this.ownerUserId,
    required this.iconKey,
    required this.goalText,
    required this.goalCount,
    required this.startDateIso,
    required this.durationDays,
    required this.isEndless,
    required this.resetHourLocal,
    required this.inviteCode,
    required this.createdAtMs,
  });

  final String id;
  final String name;
  final String ownerUserId;

  /// Key for a built-in illustration/icon (no external images needed)
  final String iconKey;

  /// e.g. "Pushups"
  final String goalText;

  /// optional, e.g. 20
  final int? goalCount;

  /// YYYY-MM-DD (local)
  final String startDateIso;

  /// ignored when isEndless == true
  final int durationDays;

  final bool isEndless;

  /// Local reset hour (0-23). If now.hour < resetHour, we consider it “yesterday”.
  final int resetHourLocal;

  /// Short code to share (WhatsApp friendly)
  final String inviteCode;

  final int createdAtMs;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'ownerUserId': ownerUserId,
      'iconKey': iconKey,
        'goalText': goalText,
        'goalCount': goalCount,
        'startDateIso': startDateIso,
        'durationDays': durationDays,
        'isEndless': isEndless,
        'resetHourLocal': resetHourLocal,
        'inviteCode': inviteCode,
        'createdAtMs': createdAtMs,
      };

  static Challenge fromJson(Map<String, Object?> json) {
    return Challenge(
      id: json['id'] as String,
      name: json['name'] as String,
      ownerUserId: json['ownerUserId'] as String,
      iconKey: (json['iconKey'] as String?) ?? 'workout',
      goalText: json['goalText'] as String,
      goalCount: (json['goalCount'] as num?)?.toInt(),
      startDateIso: json['startDateIso'] as String,
      durationDays: (json['durationDays'] as num).toInt(),
      isEndless: json['isEndless'] as bool,
      resetHourLocal: (json['resetHourLocal'] as num).toInt(),
      inviteCode: json['inviteCode'] as String,
      createdAtMs: (json['createdAtMs'] as num).toInt(),
    );
  }
}

class Membership {
  const Membership({
    required this.challengeId,
    required this.userId,
    required this.joinedAtMs,
    required this.currentStreak,
    required this.longestStreak,
    required this.lastCheckinDateKey,
    required this.completionCount,
  });

  final String challengeId;
  final String userId;
  final int joinedAtMs;

  final int currentStreak;
  final int longestStreak;

  /// dateKey like YYYYMMDD in challenge-local interpretation
  final String? lastCheckinDateKey;

  /// total check-ins
  final int completionCount;

  Membership copyWith({
    int? currentStreak,
    int? longestStreak,
    String? lastCheckinDateKey,
    int? completionCount,
  }) {
    return Membership(
      challengeId: challengeId,
      userId: userId,
      joinedAtMs: joinedAtMs,
      currentStreak: currentStreak ?? this.currentStreak,
      longestStreak: longestStreak ?? this.longestStreak,
      lastCheckinDateKey: lastCheckinDateKey ?? this.lastCheckinDateKey,
      completionCount: completionCount ?? this.completionCount,
    );
  }

  Map<String, Object?> toJson() => {
        'challengeId': challengeId,
        'userId': userId,
        'joinedAtMs': joinedAtMs,
        'currentStreak': currentStreak,
        'longestStreak': longestStreak,
        'lastCheckinDateKey': lastCheckinDateKey,
        'completionCount': completionCount,
      };

  static Membership fromJson(Map<String, Object?> json) {
    return Membership(
      challengeId: json['challengeId'] as String,
      userId: json['userId'] as String,
      joinedAtMs: (json['joinedAtMs'] as num).toInt(),
      currentStreak: (json['currentStreak'] as num).toInt(),
      longestStreak: (json['longestStreak'] as num).toInt(),
      lastCheckinDateKey: json['lastCheckinDateKey'] as String?,
      completionCount: (json['completionCount'] as num?)?.toInt() ?? 0,
    );
  }
}

enum ProofType { none, timer, photo }

class DailyCheckin {
  const DailyCheckin({
    required this.challengeId,
    required this.userId,
    required this.dateKey,
    required this.createdAtMs,
    required this.proofType,
    required this.comment,
    required this.emoji,
    required this.timerSeconds,
    required this.photoPath,
  });

  final String challengeId;
  final String userId;

  /// YYYYMMDD computed by resetHourLocal
  final String dateKey;

  final int createdAtMs;

  final ProofType proofType;
  final String? comment;
  final String? emoji;
  final int? timerSeconds;
  final String? photoPath;

  Map<String, Object?> toJson() => {
        'challengeId': challengeId,
        'userId': userId,
        'dateKey': dateKey,
        'createdAtMs': createdAtMs,
        'proofType': proofType.name,
        'comment': comment,
        'emoji': emoji,
        'timerSeconds': timerSeconds,
        'photoPath': photoPath,
      };

  static DailyCheckin fromJson(Map<String, Object?> json) {
    return DailyCheckin(
      challengeId: json['challengeId'] as String,
      userId: json['userId'] as String,
      dateKey: json['dateKey'] as String,
      createdAtMs: (json['createdAtMs'] as num).toInt(),
      proofType: ProofType.values
              .firstWhereOrNull((e) => e.name == json['proofType']) ??
          ProofType.none,
      comment: json['comment'] as String?,
      emoji: json['emoji'] as String?,
      timerSeconds: (json['timerSeconds'] as num?)?.toInt(),
      photoPath: json['photoPath'] as String?,
    );
  }
}

String encodeJson(Object value) => jsonEncode(value);

Map<String, Object?> decodeJsonMap(String value) {
  return (jsonDecode(value) as Map).cast<String, Object?>();
}
