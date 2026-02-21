import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'data/local_store.dart';
import 'features/auth/auth_controller.dart';
import 'features/challenges/challenges_controller.dart';
import 'features/profile/profile_hub_controller.dart';
import 'features/progress/workout_history_controller.dart';
import 'features/settings/app_settings_controller.dart';
import 'features/workouts/workouts_controller.dart';
import 'ui/router.dart';
import 'ui/theme.dart';

class HabitChallengeApp extends StatefulWidget {
  const HabitChallengeApp({super.key});

  @override
  State<HabitChallengeApp> createState() => _HabitChallengeAppState();
}

class _HabitChallengeAppState extends State<HabitChallengeApp> {
  late final LocalStore _store;
  late final AuthController _auth;
  late final ChallengesController _challenges;
  late final WorkoutsController _workouts;
  late final WorkoutHistoryController _history;
  late final AppSettingsController _settings;
  late final ProfileHubController _profile;

  @override
  void initState() {
    super.initState();
    _store = LocalStore();
    _auth = AuthController(store: _store);
    _challenges = ChallengesController(store: _store, auth: _auth);
    _workouts = WorkoutsController(store: _store);
    _history = WorkoutHistoryController(store: _store);
    _settings = AppSettingsController(store: _store);
    _profile = ProfileHubController(store: _store);

    // Fire-and-forget load.
    _auth.load();
    _challenges.load();
    _workouts.load();
    _history.load();
    _settings.load();
    _profile.load();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _settings,
      builder: (context, _) {
        return MaterialApp(
          title: 'Habit Challenge',
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: _settings.themeMode,
          locale: _settings.locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: AppRouter(
            auth: _auth,
            challenges: _challenges,
            workouts: _workouts,
            history: _history,
            settings: _settings,
            profile: _profile,
          ),
        );
      },
    );
  }
}
