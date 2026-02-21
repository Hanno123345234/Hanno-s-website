import 'package:flutter/material.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/challenges/home_screen.dart';
import '../features/challenges/challenges_controller.dart';
import '../features/profile/profile_hub_controller.dart';
import '../features/progress/workout_history_controller.dart';
import '../features/settings/app_settings_controller.dart';
import '../features/workouts/workouts_controller.dart';

class AppRouter extends StatefulWidget {
  const AppRouter({
    super.key,
    required this.auth,
    required this.challenges,
    required this.workouts,
    required this.history,
    required this.settings,
    required this.profile,
  });

  final AuthController auth;
  final ChallengesController challenges;
  final WorkoutsController workouts;
  final WorkoutHistoryController history;
  final AppSettingsController settings;
  final ProfileHubController profile;

  @override
  State<AppRouter> createState() => _AppRouterState();
}

class _AppRouterState extends State<AppRouter> {
  @override
  void initState() {
    super.initState();
    widget.auth.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.auth.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  @override
  Widget build(BuildContext context) {
    if (!widget.auth.isReady) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (widget.auth.currentUser == null) {
      return LoginScreen(auth: widget.auth);
    }

    return HomeScreen(
      auth: widget.auth,
      challenges: widget.challenges,
      workouts: widget.workouts,
      history: widget.history,
      settings: widget.settings,
      profile: widget.profile,
    );
  }
}
