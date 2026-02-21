import 'package:flutter/material.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchCtrl.text.trim().toLowerCase();

    final items = <({String q, String a})>[
      (
        q: 'Was sind Erfolge?',
        a: 'Erfolge sind Meilensteine, die du durch regelmäßiges Training erreichst. (MVP: Platzhalter)'
      ),
      (
        q: 'Was sind Trophäen?',
        a: 'Trophäen sind Belohnungen für bestimmte Ziele oder Streaks. (MVP: Platzhalter)'
      ),
      (
        q: 'Was sind Trainingsserien?',
        a: 'Trainingsserien beschreiben, wie viele Workouts du hintereinander absolvierst.'
      ),
      (
        q: 'Was ist "Dein Gym"?',
        a: 'Dein Gym ist dein Equipment-/Gewichte-Setup, damit dir passende Übungen angezeigt werden.'
      ),
      (
        q: 'Wofür braucht die App meine Trainingserfahrung?',
        a: 'Damit Intensität, Volumen und Vorschläge besser zu dir passen.'
      ),
      (
        q: 'Wofür braucht die App mein Geschlecht?',
        a: 'Optional, um Empfehlungen und Referenzwerte besser anpassen zu können.'
      ),
      (
        q: 'Wofür braucht die App mein Körpergewicht?',
        a: 'Optional, z.B. für Gewichts-Tracking und belastungsbezogene Empfehlungen.'
      ),
      (
        q: 'Ich habe meine Login Daten vergessen.',
        a: 'Nutze die Anmeldung erneut mit derselben E-Mail. (MVP: Lokales Login)'
      ),
      (
        q: 'Wo kann ich mich registrieren?',
        a: 'Im MVP gibt es keine separate Registrierung – du meldest dich per E-Mail an.'
      ),
    ];

    final filtered = query.isEmpty
        ? items
        : items
            .where((it) =>
                it.q.toLowerCase().contains(query) || it.a.toLowerCase().contains(query))
            .toList(growable: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('FAQ'),
        actions: [
          TextButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Kontakt kommt als nächstes.')),
              );
            },
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Fragen? Schreib uns'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          TextField(
            controller: _searchCtrl,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: 'Suchen',
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          for (final it in filtered)
            Card(
              child: ExpansionTile(
                leading: const Icon(Icons.help_outline),
                title: Text(it.q),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(it.a),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
