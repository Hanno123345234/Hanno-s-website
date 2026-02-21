import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:habit_challenge/src/app.dart';

void main() {
  testWidgets('App boots (smoke test)', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});

    await tester.pumpWidget(const HabitChallengeApp());
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
