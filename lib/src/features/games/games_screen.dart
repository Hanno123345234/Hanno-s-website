import 'package:flutter/material.dart';

import 'impostor/impostor_setup_screen.dart';

class GamesScreen extends StatefulWidget {
  const GamesScreen({super.key});

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  final _query = TextEditingController();
  bool _favoritesOnly = false;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    final games = <_GameCardModel>[
      _GameCardModel(
        id: 'impostor',
        title: 'Impostor',
        subtitle: 'von Hannes & Jeremy',
        popular: true,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ImpostorSetupScreen()),
          );
        },
      ),
      _GameCardModel(
        id: 'gift',
        title: 'Ein kleines\nGeschenk',
        subtitle: '',
        popular: false,
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Kommt bald.')),
          );
        },
      ),
      _GameCardModel(
        id: 'werewolves',
        title: 'Werwölfe\ndas Spiel',
        subtitle: '',
        popular: true,
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Kommt bald.')),
          );
        },
      ),
      _GameCardModel(
        id: 'bomb',
        title: 'Wer hat die\nBombe',
        subtitle: '',
        popular: true,
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Kommt bald.')),
          );
        },
      ),
    ];

    final query = _query.text.trim().toLowerCase();
    final filtered = games.where((g) {
      if (_favoritesOnly) return g.id == 'impostor';
      if (query.isEmpty) return true;
      return g.title.toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Spiele',
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                IconButton(
                  tooltip: 'Einstellungen',
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Kommt bald.')),
                    );
                  },
                  icon: const Icon(Icons.settings_outlined),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Spiel suchen',
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.group_outlined, size: 18),
                  label: const Text('Spieleranzahl'),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Kommt bald.')),
                    );
                  },
                ),
                FilterChip(
                  label: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.favorite_border, size: 18),
                      SizedBox(width: 8),
                      Text('Favoriten'),
                    ],
                  ),
                  selected: _favoritesOnly,
                  onSelected: (v) => setState(() => _favoritesOnly = v),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final crossAxisCount = constraints.maxWidth >= 700 ? 3 : 2;
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.78,
                  ),
                  itemBuilder: (context, i) => _GameCard(
                    model: filtered[i],
                    tagBg: cs.primaryContainer,
                    tagFg: cs.onPrimaryContainer,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _GameCardModel {
  _GameCardModel({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.popular,
    required this.onTap,
  });

  final String id;
  final String title;
  final String subtitle;
  final bool popular;
  final VoidCallback onTap;
}

class _GameCard extends StatelessWidget {
  const _GameCard({required this.model, required this.tagBg, required this.tagFg});

  final _GameCardModel model;
  final Color tagBg;
  final Color tagFg;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: model.onTap,
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      cs.primaryContainer,
                      cs.surface,
                    ],
                  ),
                ),
              ),
            ),
            if (model.popular)
              Positioned(
                left: 12,
                top: 12,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: tagBg,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Text(
                      'Beliebt',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: tagFg,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    model.title,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                      height: 1.05,
                    ),
                  ),
                  if (model.subtitle.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      model.subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
