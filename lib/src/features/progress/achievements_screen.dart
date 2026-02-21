import 'package:flutter/material.dart';

import '../profile/profile_hub_controller.dart';
import '../workouts/workouts_controller.dart';
import 'workout_history_controller.dart';

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({
    super.key,
    required this.profile,
    required this.workouts,
    required this.history,
  });

  final ProfileHubController profile;
  final WorkoutsController workouts;
  final WorkoutHistoryController history;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([profile, profile.basicInfo, profile.weight, profile.gym, workouts, history]),
      builder: (context, _) {
        final completed = history.totalCompleted;
        final streak = history.streakDays;

        final weightEntries = profile.weight.entries.length;
        final eqSelected = profile.gym.equipment.values.where((v) => v).length;
        final weightsCount = profile.gym.availableWeights.length;

        final achievements = <_AchievementCardData>[
          _AchievementCardData(
            icon: Icons.bolt,
            title: 'Erstes Workout',
            subtitle: 'Schließe dein erstes Workout ab.',
            progressText: '$completed/1',
            earned: completed >= 1,
          ),
          _AchievementCardData(
            icon: Icons.local_fire_department,
            title: '7 Tage Streak',
            subtitle: '7 Tage hintereinander ein Workout abschließen.',
            progressText: '$streak/7',
            earned: streak >= 7,
          ),
          _AchievementCardData(
            icon: Icons.emoji_events,
            title: '10 Workouts',
            subtitle: 'Insgesamt 10 Workouts abschließen.',
            progressText: '$completed/10',
            earned: completed >= 10,
          ),
          _AchievementCardData(
            icon: Icons.monitor_weight_outlined,
            title: 'Erstes Wiegen',
            subtitle: 'Trage dein Körpergewicht einmal ein.',
            progressText: '$weightEntries/1',
            earned: weightEntries >= 1,
          ),
          _AchievementCardData(
            icon: Icons.fitness_center_outlined,
            title: 'Gym eingerichtet',
            subtitle: 'Wähle Equipment und Gewichte für dein Gym.',
            progressText: '$eqSelected Equip • $weightsCount Gewichte',
            earned: eqSelected >= 2 && weightsCount >= 1,
          ),
          _AchievementCardData(
            icon: Icons.person_outline,
            title: 'Profil-Setup',
            subtitle: 'Grundangaben, Gym und Gewicht gepflegt.',
            progressText: 'Workouts: ${workouts.workouts.length}',
            earned: profile.basicInfo.isReady && profile.weight.entries.isNotEmpty && eqSelected >= 2,
          ),
        ];

        final earnedCount = achievements.where((a) => a.earned).length;

        return Scaffold(
          appBar: AppBar(title: const Text('Trophäen')),
          body: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.emoji_events_outlined),
                  title: const Text('Deine Trophäen'),
                  subtitle: Text('$earnedCount von ${achievements.length} freigeschaltet'),
                ),
              ),
              const SizedBox(height: 12),
              for (final a in achievements)
                Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: a.earned
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                      foregroundColor: a.earned
                          ? Theme.of(context).colorScheme.onPrimary
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                      child: Icon(a.icon),
                    ),
                    title: Text(a.title),
                    subtitle: Text('${a.subtitle}\n${a.progressText}'),
                    isThreeLine: true,
                    trailing: Icon(a.earned ? Icons.check_circle : Icons.lock_outline),
                  ),
                ),
              const SizedBox(height: 80),
            ],
          ),
        );
      },
    );
  }
}

class _AchievementCardData {
  const _AchievementCardData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.progressText,
    required this.earned,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String progressText;
  final bool earned;
}
