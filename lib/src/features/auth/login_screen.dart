import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'auth_controller.dart';
import '../../ui/widgets/hero_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;

  static const bool _devQuickLoginEnabled = bool.fromEnvironment(
    'DEV_QUICK_LOGIN',
    defaultValue: false,
  );

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    setState(() => _busy = true);
    try {
      await widget.auth.requestEmailCode(_email.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Code wurde angefordert.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final allowDevQuickLogin = kDebugMode || _devQuickLoginEnabled;
    final email = _email.text.trim();
    final code = _code.text.trim();

    if (allowDevQuickLogin && email.toLowerCase() == 'hanno' && code == 'login') {
      setState(() => _busy = true);
      try {
        await widget.auth.devQuickSignIn(displayName: 'Hanno');
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      } finally {
        if (mounted) setState(() => _busy = false);
      }
      return;
    }

    setState(() => _busy = true);
    try {
      await widget.auth.verifyEmailCode(_code.text);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final codeSent = widget.auth.codeSent;
    final allowDevQuickLogin = kDebugMode || _devQuickLoginEnabled;

    return Scaffold(
      appBar: AppBar(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
            HeroCard(
              title: 'Habit Challenge',
              subtitle: 'Daily streaks with friends.\nOne code. One tap. Every day.',
              trailing: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  height: 74,
                  width: 120,
                  child: SvgPicture.asset(
                    'assets/illustrations/streak.svg',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text('Login', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 6),
            Text(
              'Gib deine Email ein, wir senden dir einen Code.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _email,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.alternate_email),
              ),
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _busy ? null : _sendCode(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : _sendCode,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Code senden'),
            ),

            if (allowDevQuickLogin) ...[
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: const [
                      Icon(Icons.lock_reset),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'DEV: Quick Login mit Email "Hanno" und Code "login".',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            if (widget.auth.devLastCode != null) ...[
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      const Icon(Icons.developer_mode),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SelectableText(
                          'DEV-CODE: ${widget.auth.devLastCode}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            if (codeSent || allowDevQuickLogin) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _code,
                decoration: const InputDecoration(
                  labelText: 'Code (6-stellig)',
                  prefixIcon: Icon(Icons.pin),
                ),
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _busy ? null : _verify(),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _busy ? null : _verify,
                icon: const Icon(Icons.lock_open),
                label: const Text('Fortfahren'),
              ),
            ],
        ],
      ),
    );
  }
}
