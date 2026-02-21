import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import '../gym/gym_screen.dart';
import '../metrics/weight_screen.dart';
import '../progress/achievements_screen.dart';
import '../progress/workout_history_controller.dart';
import '../progress/workout_history_screen.dart';
import '../settings/settings_screen.dart';
import '../settings/app_settings_controller.dart';
import '../workouts/workouts_controller.dart';
import 'basic_info_controller.dart';
import 'basic_info_screen.dart';
import 'profile_hub_controller.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.settings,
    required this.workouts,
    required this.profile,
    required this.history,
  });

  final AppSettingsController settings;
  final WorkoutsController workouts;
  final ProfileHubController profile;
  final WorkoutHistoryController history;

  String _genderLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'Männlich';
      case Gender.female:
        return 'Weiblich';
      case Gender.diverse:
        return 'Divers';
      case Gender.unspecified:
        return 'Keine Angabe';
    }
  }

  String _experienceLabel(TrainingExperience e) {
    switch (e) {
      case TrainingExperience.untrained:
        return 'Untrainiert';
      case TrainingExperience.beginner:
        return 'Einsteiger';
      case TrainingExperience.intermediate:
        return 'Fortgeschritten';
      case TrainingExperience.advanced:
        return 'Sehr erfahren';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.homeSettings),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SettingsScreen(controller: settings),
                ),
              );
            },
            child: Text(l10n.homeSettings),
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: Listenable.merge([
          workouts,
          profile,
          profile.basicInfo,
          profile.weight,
          profile.gym,
          history,
        ]),
        builder: (context, _) {
          final latest = profile.weight.latest;
          final latestWeightText = latest == null ? '—' : '${latest.kg.toStringAsFixed(1)} kg';
          final eqSelected = profile.gym.equipment.values.where((v) => v).length;
          final weightsCount = profile.gym.availableWeights.length;
          final streak = history.streakDays;
          final completed = history.totalCompleted;

          final gender = _genderLabel(profile.basicInfo.gender);
          final exp = _experienceLabel(profile.basicInfo.experience);

          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.emoji_events_outlined),
                  title: const Text('Trophäen'),
                  subtitle: const Text('Badges & Fortschritt'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AchievementsScreen(
                          profile: profile,
                          workouts: workouts,
                          history: history,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.bolt, color: Colors.orange),
                            const SizedBox(height: 8),
                            Text(
                              '$completed',
                              style: theme.textTheme.headlineMedium,
                            ),
                            const Text('abgeschlossen'),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.local_fire_department, color: Colors.orange),
                            const SizedBox(height: 8),
                            Text('$streak', style: theme.textTheme.headlineMedium),
                            const Text('am Stück'),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.history),
                  title: const Text('Verlauf'),
                  subtitle: const Text('Deine abgeschlossenen Workouts'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => WorkoutHistoryScreen(history: history, workouts: workouts),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.fitness_center_outlined),
                  title: const Text('Dein Gym'),
                  subtitle: Text('$eqSelected Equipment • $weightsCount Gewichte'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => GymScreen(controller: profile.gym),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.monitor_weight_outlined),
                  title: const Text('Körpergewicht'),
                  subtitle: const Text('Verlauf & Einträge'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        latestWeightText,
                        style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => WeightScreen(controller: profile.weight),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.badge_outlined),
                  title: const Text('Grundangaben'),
                  subtitle: Text(
                    '$gender • $exp',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BasicInfoScreen(controller: profile.basicInfo),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => WeightScreen(controller: profile.weight),
                    ),
                  );
                },
                child: const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Messwert hinzufügen'),
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => BasicInfoScreen(controller: profile.basicInfo),
                    ),
                  );
                },
                child: const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Grundangaben'),
                ),
              ),
              TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Hilfe/FAQ findest du im Home-Tab.')),
                  );
                },
                child: const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Hilfe'),
                ),
              ),
              const SizedBox(height: 80),
            ],
          );
        },
      ),
    );
  }
}
