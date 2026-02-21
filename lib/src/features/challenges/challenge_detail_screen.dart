import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../domain/models.dart';
import '../../domain/streaks.dart';
import '../auth/auth_controller.dart';
import '../checkin/checkin_sheet.dart';
import 'challenges_controller.dart';
import 'compare_screen.dart';

class ChallengeDetailScreen extends StatefulWidget {
  const ChallengeDetailScreen({
    super.key,
    required this.controller,
    required this.auth,
    required this.challengeId,
  });

  final ChallengesController controller;
  final AuthController auth;
  final String challengeId;

  @override
  State<ChallengeDetailScreen> createState() => _ChallengeDetailScreenState();
}

class _ChallengeDetailScreenState extends State<ChallengeDetailScreen> {
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
    final user = widget.auth.currentUser!;

    final members = widget.controller.membershipsForChallenge(c.id);
    final myMembership = members[user.id];

    final todayKey = dateKeyForNow(
      nowLocal: DateTime.now(),
      resetHourLocal: c.resetHourLocal,
    );

    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(c.name),
        actions: [
          IconButton(
            tooltip: 'Compare',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CompareScreen(
                    controller: widget.controller,
                    auth: widget.auth,
                    challengeId: c.id,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.leaderboard),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            height: 150,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  cs.primary.withAlpha(242),
                  cs.tertiary.withAlpha(191),
                ],
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: SvgPicture.asset(
              c.iconKey == 'streak'
                  ? 'assets/illustrations/streak.svg'
                  : 'assets/illustrations/workout.svg',
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            c.goalCount == null ? c.goalText : '${c.goalCount} ${c.goalText}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text('Invite: ${c.inviteCode}')),
              Chip(label: Text('Reset: ${c.resetHourLocal}:00')),
              Chip(label: Text('Today: $todayKey')),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Your streak', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 6),
                  Text(
                    myMembership == null
                        ? 'Not a member'
                        : '${myMembership.currentStreak} (best: ${myMembership.longestStreak})',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FutureBuilder<DailyCheckin?>(
            future: widget.controller.getTodayCheckin(c.id),
            builder: (context, snapshot) {
              final checkin = snapshot.data;
              final atRisk = isStreakAtRisk(
                nowLocal: DateTime.now(),
                riskHourLocal: 18,
                alreadyCheckedInToday: checkin != null,
              );

              return Card(
                color: atRisk ? Theme.of(context).colorScheme.errorContainer : null,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              checkin == null ? 'Today: not done yet' : 'Today: done',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          if (atRisk)
                            const Icon(Icons.warning_amber, size: 20),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (checkin != null) ...[
                        Text('Proof: ${checkin.proofType.name}'),
                        if (checkin.emoji != null) Text('Emoji: ${checkin.emoji}'),
                        if (checkin.comment != null) Text('Comment: ${checkin.comment}'),
                      ] else ...[
                        const Text('Tap check-in to keep your streak.'),
                      ],
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () async {
                          await showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            builder: (_) => CheckinSheet(
                              challengeId: c.id,
                              controller: widget.controller,
                              alreadyCheckedIn: checkin != null,
                            ),
                          );
                          if (mounted) setState(() {});
                        },
                        icon: Icon(checkin == null ? Icons.check : Icons.undo),
                        label: Text(checkin == null ? 'Check-in' : 'Undo today'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: c.inviteCode));
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Copied invite code')), 
                    );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Copy code'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Share.share('Join my challenge "${c.name}": code ${c.inviteCode}');
                  },
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Members: ${members.length}',
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ],
      ),
    );
  }
}
