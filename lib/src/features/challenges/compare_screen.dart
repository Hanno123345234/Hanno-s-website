import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/streaks.dart';
import '../auth/auth_controller.dart';
import 'challenges_controller.dart';

class CompareScreen extends StatefulWidget {
  const CompareScreen({
    super.key,
    required this.controller,
    required this.auth,
    required this.challengeId,
  });

  final ChallengesController controller;
  final AuthController auth;
  final String challengeId;

  @override
  State<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends State<CompareScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final c = widget.controller.challenges
        .firstWhere((x) => x.id == widget.challengeId);

    final members = widget.controller.membershipsForChallenge(c.id).values.toList();
    members.sort((a, b) => b.currentStreak.compareTo(a.currentStreak));

    final todayKey = dateKeyForNow(
      nowLocal: DateTime.now(),
      resetHourLocal: c.resetHourLocal,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Compare')),
      body: FutureBuilder<List<DailyCheckin>>(
        future: widget.controller.getCheckinsForToday(c.id),
        builder: (context, snapshot) {
          final checkins = snapshot.data ?? const <DailyCheckin>[];
          final checkedUserIds = checkins.map((c) => c.userId).toSet();

          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Card(
                child: ListTile(
                  title: Text(c.name),
                  subtitle: Text('Today: $todayKey'),
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  title: const Text('Today status'),
                  subtitle: Text('${checkedUserIds.length}/${members.length} checked in'),
                ),
              ),
              const SizedBox(height: 8),
              Text('Leaderboard', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              for (final m in members)
                Card(
                  child: ListTile(
                    title: Text(_labelForMember(m, widget.auth)),
                    subtitle: Text('Streak: ${m.currentStreak} • Total: ${m.completionCount}'),
                    trailing: Icon(
                      checkedUserIds.contains(m.userId) ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: checkedUserIds.contains(m.userId)
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  String _labelForMember(Membership m, AuthController auth) {
    final me = auth.currentUser;
    if (me != null && m.userId == me.id) return '${me.displayName} (you)';
    // Local MVP: we only know the signed-in user’s name.
    return 'Friend ${m.userId.substring(0, 4)}';
  }
}
