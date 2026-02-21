import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import 'app_settings_controller.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.controller});

  final AppSettingsController controller;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
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
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settingsTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.appearance, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  RadioGroup<ThemeMode>(
                    groupValue: widget.controller.themeMode,
                    onChanged: (v) {
                      if (v != null) widget.controller.setThemeMode(v);
                    },
                    child: Column(
                      children: [
                        RadioListTile<ThemeMode>(
                          value: ThemeMode.system,
                          title: Text(l10n.themeSystem),
                        ),
                        RadioListTile<ThemeMode>(
                          value: ThemeMode.light,
                          title: Text(l10n.themeLight),
                        ),
                        RadioListTile<ThemeMode>(
                          value: ThemeMode.dark,
                          title: Text(l10n.themeDark),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.language, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  RadioGroup<Locale>(
                    groupValue: widget.controller.locale ?? const Locale('system'),
                    onChanged: (v) {
                      if (v == null) return;
                      if (v.languageCode == 'system') {
                        widget.controller.setLocale(null);
                      } else {
                        widget.controller.setLocale(v);
                      }
                    },
                    child: Column(
                      children: [
                        RadioListTile<Locale>(
                          value: const Locale('system'),
                          title: Text(l10n.languageSystem),
                        ),
                        RadioListTile<Locale>(
                          value: const Locale('de'),
                          title: Text(l10n.languageGerman),
                        ),
                        RadioListTile<Locale>(
                          value: const Locale('en'),
                          title: Text(l10n.languageEnglish),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline),
              title: Text(l10n.about),
              subtitle: Text(l10n.aboutSubtitle),
            ),
          ),
        ],
      ),
    );
  }
}
