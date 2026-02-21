// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appName => 'Habit Challenge';

  @override
  String get commonCancel => 'Abbrechen';

  @override
  String get commonSave => 'Speichern';

  @override
  String get commonContinue => 'Weiter';

  @override
  String get commonCopied => 'Kopiert';

  @override
  String get loginTitle => 'Anmelden';

  @override
  String get loginHeroSubtitle =>
      'Tägliche Streaks mit Freunden.\nEin Code. Ein Tap. Jeden Tag.';

  @override
  String get loginHint => 'Gib deine E-Mail ein. Wir senden dir einen Code.';

  @override
  String get emailLabel => 'E-Mail';

  @override
  String get sendCode => 'Code senden';

  @override
  String get codeRequested => 'Code wurde angefordert.';

  @override
  String get codeLabel => 'Code (6-stellig)';

  @override
  String get loginProceed => 'Weiter';

  @override
  String homeGreeting(Object name) {
    return 'Hi, $name';
  }

  @override
  String get homeReminder => 'Erinnerung';

  @override
  String get homeSettings => 'Einstellungen';

  @override
  String get homeLogout => 'Abmelden';

  @override
  String get homeCreate => 'Erstellen';

  @override
  String get homeJoinViaCode => 'Mit Code beitreten';

  @override
  String get homeEmptyTitle => 'Erstelle eine Gruppe und lade Freunde ein';

  @override
  String get homeEmptySubtitle =>
      'Tägliche Check-ins halten deinen Streak am Leben.';

  @override
  String get homeHowItWorks => 'So funktioniert\'s';

  @override
  String get homeStep1 => 'Gruppe erstellen';

  @override
  String get homeStep1Desc => 'Ziel und Reset-Zeit festlegen.';

  @override
  String get homeStep2 => 'Freunde einladen';

  @override
  String get homeStep2Desc => 'Invite-Code teilen.';

  @override
  String get homeStep3 => 'Täglich abhaken';

  @override
  String get homeStep3Desc => 'Ein Tap pro Tag hält den Streak.';

  @override
  String get createGroupTitle => 'Gruppe erstellen';

  @override
  String get groupStyleLabel => 'Stil';

  @override
  String get groupStyleWorkout => 'Workout';

  @override
  String get groupStyleStreak => 'Streak';

  @override
  String get nameLabel => 'Name';

  @override
  String get amountOptional => 'Zahl (optional)';

  @override
  String get goalText => 'Ziel (Text)';

  @override
  String get startTomorrow => 'Morgen starten';

  @override
  String get endless => 'Ohne Ende';

  @override
  String get durationDays => 'Dauer (Tage)';

  @override
  String get dailyResetHour => 'Täglicher Reset';

  @override
  String get createGroupButton => 'Gruppe erstellen';

  @override
  String createFailed(Object error) {
    return 'Erstellen fehlgeschlagen: $error';
  }

  @override
  String get joinChallengeTitle => 'Challenge beitreten';

  @override
  String get pasteInviteCode => 'Invite-Code von einem Freund einfügen:';

  @override
  String get inviteCodeLabel => 'Invite-Code';

  @override
  String get join => 'Beitreten';

  @override
  String joinFailed(Object error) {
    return 'Beitreten fehlgeschlagen: $error';
  }

  @override
  String get compareTitle => 'Vergleichen';

  @override
  String todayLabel(Object todayKey) {
    return 'Heute: $todayKey';
  }

  @override
  String get todayStatus => 'Status heute';

  @override
  String checkedInCount(Object done, Object total) {
    return '$done/$total abgehakt';
  }

  @override
  String get leaderboard => 'Rangliste';

  @override
  String streak(Object streak) {
    return 'Streak: $streak';
  }

  @override
  String streakAndTotal(Object streak, Object total) {
    return 'Streak: $streak • Gesamt: $total';
  }

  @override
  String get youSuffix => '(du)';

  @override
  String friendLabel(Object code) {
    return 'Freund $code';
  }

  @override
  String get challengeCompare => 'Vergleichen';

  @override
  String challengeInvite(Object code) {
    return 'Invite: $code';
  }

  @override
  String challengeReset(Object hour) {
    return 'Reset: $hour:00';
  }

  @override
  String challengeToday(Object todayKey) {
    return 'Heute: $todayKey';
  }

  @override
  String get yourStreak => 'Dein Streak';

  @override
  String get notAMember => 'Nicht beigetreten';

  @override
  String streakBest(Object best, Object current) {
    return '$current (Best: $best)';
  }

  @override
  String get todayNotDone => 'Heute: noch nicht';

  @override
  String get todayDone => 'Heute: erledigt';

  @override
  String get tapCheckinHint => 'Tippe auf Check-in, um den Streak zu halten.';

  @override
  String get checkin => 'Check-in';

  @override
  String get undoToday => 'Heute rückgängig';

  @override
  String proof(Object type) {
    return 'Beweis: $type';
  }

  @override
  String emoji(Object emoji) {
    return 'Emoji: $emoji';
  }

  @override
  String comment(Object comment) {
    return 'Kommentar: $comment';
  }

  @override
  String get copiedInviteCode => 'Invite-Code kopiert';

  @override
  String get copyCode => 'Code kopieren';

  @override
  String get share => 'Teilen';

  @override
  String shareText(Object code, Object name) {
    return 'Komm in meine Challenge \"$name\": Code $code';
  }

  @override
  String membersCount(Object count) {
    return 'Mitglieder: $count';
  }

  @override
  String get reminderTitle => 'Erinnerung';

  @override
  String get dailyReminder => 'Tägliche Erinnerung';

  @override
  String get localNotificationHint => 'Lokale Benachrichtigung (kein Push).';

  @override
  String get time => 'Uhrzeit';

  @override
  String get notificationPermissionNotGranted =>
      'Benachrichtigungen nicht erlaubt';

  @override
  String get saved => 'Gespeichert';

  @override
  String get settingsTitle => 'Einstellungen';

  @override
  String get language => 'Sprache';

  @override
  String get languageSystem => 'System';

  @override
  String get languageGerman => 'Deutsch';

  @override
  String get languageEnglish => 'Englisch';

  @override
  String get appearance => 'Aussehen';

  @override
  String get theme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Hell';

  @override
  String get themeDark => 'Dunkel';

  @override
  String get about => 'Info';

  @override
  String get aboutSubtitle =>
      'MVP-Vorschau. Sync und echte Mail-Codes kommen später.';
}
