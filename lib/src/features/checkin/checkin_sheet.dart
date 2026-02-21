import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../domain/models.dart';
import '../challenges/challenges_controller.dart';

class CheckinSheet extends StatefulWidget {
  const CheckinSheet({
    super.key,
    required this.challengeId,
    required this.controller,
    required this.alreadyCheckedIn,
  });

  final String challengeId;
  final ChallengesController controller;
  final bool alreadyCheckedIn;

  @override
  State<CheckinSheet> createState() => _CheckinSheetState();
}

class _CheckinSheetState extends State<CheckinSheet> {
  ProofType _proof = ProofType.none;
  final _emoji = TextEditingController();
  final _comment = TextEditingController();

  int _timerSeconds = 60;
  int? _countdown;
  Timer? _timer;

  String? _photoPath;

  bool _busy = false;

  @override
  void dispose() {
    _timer?.cancel();
    _emoji.dispose();
    _comment.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _countdown = _timerSeconds);

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      final v = _countdown ?? 0;
      if (v <= 1) {
        t.cancel();
        setState(() => _countdown = 0);
        return;
      }
      setState(() => _countdown = v - 1);
    });
  }

  Future<void> _pickPhoto() async {
    try {
      final picker = ImagePicker();
      final photo = await picker.pickImage(source: ImageSource.camera);
      if (photo == null) return;
      setState(() => _photoPath = photo.path);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Photo failed: $e')),
      );
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await widget.controller.toggleCheckinToday(
        challengeId: widget.challengeId,
        proofType: _proof,
        emoji: _emoji.text,
        comment: _comment.text,
        timerSeconds: _proof == ProofType.timer ? _timerSeconds : null,
        photoPath: _proof == ProofType.photo ? _photoPath : null,
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Check-in failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: bottom + 16),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.alreadyCheckedIn ? 'Undo check-in' : 'Check-in',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            if (widget.alreadyCheckedIn)
              const Text('This will remove today\'s check-in (MVP).')
            else ...[
              DropdownButtonFormField<ProofType>(
                initialValue: _proof,
                decoration: const InputDecoration(
                  labelText: 'Proof (optional)',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: ProofType.none, child: Text('None')),
                  DropdownMenuItem(value: ProofType.timer, child: Text('Timer')),
                  DropdownMenuItem(value: ProofType.photo, child: Text('Photo (camera)')),
                ],
                onChanged: (v) => setState(() => _proof = v ?? ProofType.none),
              ),
              const SizedBox(height: 12),
              if (_proof == ProofType.timer) ...[
                Row(
                  children: [
                    const Text('Seconds:'),
                    const SizedBox(width: 12),
                    DropdownButton<int>(
                      value: _timerSeconds,
                      items: const [30, 60, 90, 120, 180]
                          .map((s) => DropdownMenuItem(value: s, child: Text('$s')))
                          .toList(),
                      onChanged: (v) => setState(() => _timerSeconds = v ?? 60),
                    ),
                    const Spacer(),
                    OutlinedButton.icon(
                      onPressed: _startTimer,
                      icon: const Icon(Icons.timer),
                      label: const Text('Start'),
                    ),
                  ],
                ),
                if (_countdown != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Countdown: ${_countdown}s'),
                  ),
                const SizedBox(height: 12),
              ],
              if (_proof == ProofType.photo) ...[
                OutlinedButton.icon(
                  onPressed: _pickPhoto,
                  icon: const Icon(Icons.photo_camera),
                  label: Text(_photoPath == null ? 'Take photo' : 'Retake photo'),
                ),
                if (_photoPath != null)
                  Text(
                    'Saved: $_photoPath',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _emoji,
                decoration: const InputDecoration(
                  labelText: 'Emoji (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _comment,
                decoration: const InputDecoration(
                  labelText: 'Comment (optional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
            ],
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(widget.alreadyCheckedIn ? 'Undo' : 'Confirm'),
            ),
          ],
        ),
      ),
    );
  }
}
