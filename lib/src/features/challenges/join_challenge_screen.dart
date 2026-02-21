import 'package:flutter/material.dart';

import 'challenges_controller.dart';

class JoinChallengeScreen extends StatefulWidget {
  const JoinChallengeScreen({super.key, required this.controller});

  final ChallengesController controller;

  @override
  State<JoinChallengeScreen> createState() => _JoinChallengeScreenState();
}

class _JoinChallengeScreenState extends State<JoinChallengeScreen> {
  final _code = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    setState(() => _busy = true);
    try {
      await widget.controller.joinChallengeByCode(_code.text);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Join failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Join Challenge')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Paste invite code from a friend:'),
            const SizedBox(height: 12),
            TextField(
              controller: _code,
              decoration: const InputDecoration(
                labelText: 'Invite code',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : _join,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Join'),
            ),
          ],
        ),
      ),
    );
  }
}
