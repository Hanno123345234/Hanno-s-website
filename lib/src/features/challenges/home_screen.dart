import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../auth/auth_controller.dart';
import '../../data/local_store.dart';
import '../games/games_screen.dart';
import '../help/help_screen.dart';
import '../profile/profile_screen.dart';
import '../profile/profile_hub_controller.dart';
import '../progress/log_workout_sheet.dart';
import '../progress/workout_history_controller.dart';
import '../progress/workout_history_screen.dart';
import '../reminders/reminder_screen.dart';
import '../settings/app_settings_controller.dart';
import '../workouts/create_workout_screen.dart';
import '../workouts/workouts_controller.dart';
import '../workouts/workouts_screen.dart';
import 'challenge_detail_screen.dart';
import 'challenges_controller.dart';
import 'create_challenge_screen.dart';
import 'join_challenge_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
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
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _store = LocalStore();
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    widget.challenges.addListener(_onChange);
    widget.workouts.addListener(_onChange);
    widget.history.addListener(_onChange);
  }

  @override
  void dispose() {
    widget.challenges.removeListener(_onChange);
    widget.workouts.removeListener(_onChange);
    widget.history.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() => setState(() {});

  Future<void> _openCreateSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Erstellen',
                  style: Theme.of(ctx).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.fitness_center),
                    title: const Text('Workout erstellen'),
                    subtitle: const Text('Dauer, Notizen (Übungen als nächstes).'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      Navigator.of(ctx).pop();
                      final created = await Navigator.of(context).push<bool>(
                        MaterialPageRoute(
                          builder: (_) => CreateWorkoutScreen(controller: widget.workouts),
                        ),
                      );
                      if (created == true && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Workout gespeichert')),
                        );
                      }
                    },
                  ),
                ),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.view_week_outlined),
                    title: const Text('Plan erstellen'),
                    subtitle: const Text('Kommt als nächstes.'),
                    trailing: const Icon(Icons.lock_outline),
                    enabled: false,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Schließen'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tabIndex,
        children: [
          _DashboardTab(
            auth: widget.auth,
            challenges: widget.challenges,
            workouts: widget.workouts,
            history: widget.history,
            store: _store,
            onOpenCreate: () => _openCreateSheet(context),
          ),
          WorkoutsScreen(controller: widget.workouts, history: widget.history),
          ProfileScreen(
            settings: widget.settings,
            workouts: widget.workouts,
            profile: widget.profile,
            history: widget.history,
          ),
          const _PremiumTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.share_outlined), label: ''),
          NavigationDestination(icon: Icon(Icons.fitness_center_outlined), label: ''),
          NavigationDestination(icon: Icon(Icons.person_outline), label: ''),
          NavigationDestination(icon: Icon(Icons.lock_outline), label: ''),
        ],
      ),
    );
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({
    required this.auth,
    required this.challenges,
    required this.workouts,
    required this.history,
    required this.store,
    required this.onOpenCreate,
  });

  final AuthController auth;
  final ChallengesController challenges;
  final WorkoutsController workouts;
  final WorkoutHistoryController history;
  final LocalStore store;
  final VoidCallback onOpenCreate;

  @override
  Widget build(BuildContext context) {
    final user = auth.currentUser!;
    final items = challenges.challenges;
    final workoutsList = workouts.workouts;
    final completed = history.totalCompleted;
    final streak = history.streakDays;

    return Scaffold(
      appBar: AppBar(
        title: const Text(''),
        actions: [
          TextButton(
            onPressed: onOpenCreate,
            child: const Text('Erstellen'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                SizedBox(
                  height: 260,
                  width: double.infinity,
                  child: SvgPicture.asset(
                    'assets/illustrations/workout.svg',
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: Text(
                    'Bring dein Training\nauf ein neues Level!',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.videogame_asset_outlined),
              title: const Text('Spiele'),
              subtitle: const Text('Impostor & mehr'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const GamesScreen()),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.local_fire_department_outlined),
                  title: const Text('Dein Fortschritt'),
                  subtitle: Text('$completed Workouts • $streak Tage Streak'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => WorkoutHistoryScreen(history: history, workouts: workouts),
                      ),
                    );
                  },
                ),
                if (workoutsList.isNotEmpty) ...[
                  const Divider(height: 0),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Schnell abschließen'),
                              const SizedBox(height: 2),
                              Text(
                                workoutsList.first.name,
                                style: Theme.of(context).textTheme.titleSmall,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton.icon(
                          onPressed: () async {
                            final ok = await showLogWorkoutSheet(
                              context,
                              workout: workoutsList.first,
                              history: history,
                            );
                            if (ok && context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Workout gespeichert')),
                              );
                            }
                          },
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Done'),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => WorkoutsScreen(controller: workouts, history: history),
                ),
              );
            },
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Text('Workouts'),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => WorkoutHistoryScreen(history: history, workouts: workouts),
                ),
              );
            },
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Text('Verlauf'),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const HelpScreen()),
              );
            },
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Text('Hilfe'),
            ),
          ),
          const SizedBox(height: 12),
          if (items.isNotEmpty) ...[
            Text('Deine Gruppen', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
          ],
          for (final c in items)
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  child: Icon(c.iconKey == 'streak' ? Icons.bolt : Icons.fitness_center),
                ),
                title: Text(c.name),
                subtitle: Text(c.goalCount == null ? c.goalText : '${c.goalCount} ${c.goalText}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ChallengeDetailScreen(
                        controller: challenges,
                        auth: auth,
                        challengeId: c.id,
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
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final created = await Navigator.of(context).push<String>(
                      MaterialPageRoute(
                        builder: (_) => CreateChallengeScreen(controller: challenges),
                      ),
                    );
                    if (created != null && context.mounted) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ChallengeDetailScreen(
                            controller: challenges,
                            auth: auth,
                            challengeId: created,
                          ),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.group_add),
                  label: const Text('Gruppe erstellen'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => JoinChallengeScreen(controller: challenges),
                      ),
                    );
                  },
                  icon: const Icon(Icons.vpn_key_outlined),
                  label: const Text('Mit Code beitreten'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onOpenCreate,
            icon: const Icon(Icons.add_circle_outline),
            label: const Text('Plan oder Workout erstellen'),
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: Text(user.displayName),
              subtitle: Text(user.email),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ReminderScreen(store: store)),
                    );
                  },
                  icon: const Icon(Icons.notifications_outlined),
                  label: const Text('Erinnerung'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => auth.signOut(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Abmelden'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _PremiumTab extends StatelessWidget {
  const _PremiumTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Premium')),
      body: const Center(child: Text('Kommt bald.')),
    );
  }
}
