import 'package:flutter/material.dart';

import '../../data/local_store.dart';
import 'reminder_service.dart';

class ReminderScreen extends StatefulWidget {
  const ReminderScreen({super.key, required this.store});

  final LocalStore store;

  @override
  State<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends State<ReminderScreen> {
  static const _enabledKey = 'reminder.enabled';
  static const _timeKey = 'reminder.time'; // HH:mm

  bool _ready = false;
  bool _enabled = false;
  TimeOfDay _time = const TimeOfDay(hour: 19, minute: 0);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final enabled = await widget.store.getString(_enabledKey);
    final time = await widget.store.getString(_timeKey);

    final parsedEnabled = enabled == 'true';
    final parsedTime = _parseTime(time) ?? _time;

    setState(() {
      _enabled = parsedEnabled;
      _time = parsedTime;
      _ready = true;
    });
  }

  TimeOfDay? _parseTime(String? v) {
    if (v == null) return null;
    final parts = v.split(':');
    if (parts.length != 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  String _formatTime(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _apply() async {
    await widget.store.setString(_enabledKey, _enabled ? 'true' : 'false');
    await widget.store.setString(_timeKey, _formatTime(_time));

    if (_enabled) {
      final ok = await ReminderService.instance.requestPermissionsIfNeeded();
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification permission not granted')),
        );
        return;
      }
      await ReminderService.instance.scheduleDailyReminder(hour: _time.hour, minute: _time.minute);
    } else {
      await ReminderService.instance.cancelReminder();
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Saved')),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Reminder')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SwitchListTile(
            value: _enabled,
            onChanged: (v) => setState(() => _enabled = v),
            title: const Text('Daily reminder'),
            subtitle: const Text('Local notification (not push).'),
          ),
          const SizedBox(height: 8),
          ListTile(
            title: const Text('Time'),
            subtitle: Text(_time.format(context)),
            trailing: const Icon(Icons.schedule),
            onTap: _enabled
                ? () async {
                    final picked = await showTimePicker(context: context, initialTime: _time);
                    if (picked != null) setState(() => _time = picked);
                  }
                : null,
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _apply,
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
