import 'package:flutter/material.dart';

import 'challenges_controller.dart';

class CreateChallengeScreen extends StatefulWidget {
  const CreateChallengeScreen({super.key, required this.controller});

  final ChallengesController controller;

  @override
  State<CreateChallengeScreen> createState() => _CreateChallengeScreenState();
}

class _CreateChallengeScreenState extends State<CreateChallengeScreen> {
  final _name = TextEditingController(text: '30 Tage 20 Pushups');
  final _goalText = TextEditingController(text: 'Liegestütze');
  final _goalCount = TextEditingController(text: '20');

  String _iconKey = 'workout';

  bool _startTomorrow = false;
  bool _endless = false;
  int _durationDays = 30;
  int _resetHour = 0;

  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _goalText.dispose();
    _goalCount.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _busy = true);
    try {
      final count = int.tryParse(_goalCount.text.trim());
      final c = await widget.controller.createChallenge(
        name: _name.text,
        iconKey: _iconKey,
        goalText: _goalText.text,
        goalCount: count,
        startTomorrow: _startTomorrow,
        isEndless: _endless,
        durationDays: _durationDays,
        resetHourLocal: _resetHour,
      );
      if (mounted) Navigator.of(context).pop(c.id);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Create failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Group')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const Text('Group style:'),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _iconKey,
                items: const [
                  DropdownMenuItem(value: 'workout', child: Text('Workout')),
                  DropdownMenuItem(value: 'streak', child: Text('Streak')),
                ],
                onChanged: (v) => setState(() => _iconKey = v ?? 'workout'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: 'Name',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _goalCount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Zahl (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _goalText,
                  decoration: const InputDecoration(
                    labelText: 'Ziel (Text)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            value: _startTomorrow,
            onChanged: (v) => setState(() => _startTomorrow = v),
            title: const Text('Start tomorrow'),
          ),
          SwitchListTile(
            value: _endless,
            onChanged: (v) => setState(() => _endless = v),
            title: const Text('Endless'),
          ),
          if (!_endless) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Text('Duration (days):'),
                const SizedBox(width: 12),
                DropdownButton<int>(
                  value: _durationDays,
                  items: const [7, 14, 21, 30, 60, 90]
                      .map((d) => DropdownMenuItem(value: d, child: Text('$d')))
                      .toList(),
                  onChanged: (v) => setState(() => _durationDays = v ?? 30),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Text('Daily reset hour:'),
              const SizedBox(width: 12),
              DropdownButton<int>(
                value: _resetHour,
                items: List.generate(24, (h) => h)
                    .map((h) => DropdownMenuItem(value: h, child: Text('$h:00')))
                    .toList(),
                onChanged: (v) => setState(() => _resetHour = v ?? 0),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _create,
            child: _busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create group'),
          ),
        ],
      ),
    );
  }
}
