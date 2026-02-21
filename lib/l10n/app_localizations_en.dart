// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Habit Challenge';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonSave => 'Save';

  @override
  String get commonContinue => 'Continue';

  @override
  String get commonCopied => 'Copied';

  @override
  String get loginTitle => 'Login';

  @override
  String get loginHeroSubtitle =>
      'Daily streaks with friends.\nOne code. One tap. Every day.';

  @override
  String get loginHint => 'Enter your email. We\'ll send you a code.';

  @override
  String get emailLabel => 'Email';

  @override
  String get sendCode => 'Send code';

  @override
  String get codeRequested => 'Code requested.';

  @override
  String get codeLabel => 'Code (6 digits)';

  @override
  String get loginProceed => 'Continue';

  @override
  String homeGreeting(Object name) {
    return 'Hi, $name';
  }

  @override
  String get homeReminder => 'Reminder';

  @override
  String get homeSettings => 'Settings';

  @override
  String get homeLogout => 'Logout';

  @override
  String get homeCreate => 'Create';

  @override
  String get homeJoinViaCode => 'Join via code';

  @override
  String get homeEmptyTitle => 'Create a group and invite friends';

  @override
  String get homeEmptySubtitle => 'Daily check-ins keep your streak alive.';

  @override
  String get homeHowItWorks => 'How it works';

  @override
  String get homeStep1 => 'Create a group';

  @override
  String get homeStep1Desc => 'Pick a goal and reset time.';

  @override
  String get homeStep2 => 'Invite friends';

  @override
  String get homeStep2Desc => 'Share the invite code.';

  @override
  String get homeStep3 => 'Check in daily';

  @override
  String get homeStep3Desc => 'One tap a day keeps the streak.';

  @override
  String get createGroupTitle => 'Create group';

  @override
  String get groupStyleLabel => 'Style';

  @override
  String get groupStyleWorkout => 'Workout';

  @override
  String get groupStyleStreak => 'Streak';

  @override
  String get nameLabel => 'Name';

  @override
  String get amountOptional => 'Number (optional)';

  @override
  String get goalText => 'Goal (text)';

  @override
  String get startTomorrow => 'Start tomorrow';

  @override
  String get endless => 'Endless';

  @override
  String get durationDays => 'Duration (days)';

  @override
  String get dailyResetHour => 'Daily reset hour';

  @override
  String get createGroupButton => 'Create group';

  @override
  String createFailed(Object error) {
    return 'Create failed: $error';
  }

  @override
  String get joinChallengeTitle => 'Join challenge';

  @override
  String get pasteInviteCode => 'Paste invite code from a friend:';

  @override
  String get inviteCodeLabel => 'Invite code';

  @override
  String get join => 'Join';

  @override
  String joinFailed(Object error) {
    return 'Join failed: $error';
  }

  @override
  String get compareTitle => 'Compare';

  @override
  String todayLabel(Object todayKey) {
    return 'Today: $todayKey';
  }

  @override
  String get todayStatus => 'Today status';

  @override
  String checkedInCount(Object done, Object total) {
    return '$done/$total checked in';
  }

  @override
  String get leaderboard => 'Leaderboard';

  @override
  String streak(Object streak) {
    return 'Streak: $streak';
  }

  @override
  String streakAndTotal(Object streak, Object total) {
    return 'Streak: $streak • Total: $total';
  }

  @override
  String get youSuffix => '(you)';

  @override
  String friendLabel(Object code) {
    return 'Friend $code';
  }

  @override
  String get challengeCompare => 'Compare';

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
    return 'Today: $todayKey';
  }

  @override
  String get yourStreak => 'Your streak';

  @override
  String get notAMember => 'Not a member';

  @override
  String streakBest(Object best, Object current) {
    return '$current (best: $best)';
  }

  @override
  String get todayNotDone => 'Today: not done yet';

  @override
  String get todayDone => 'Today: done';

  @override
  String get tapCheckinHint => 'Tap check-in to keep your streak.';

  @override
  String get checkin => 'Check-in';

  @override
  String get undoToday => 'Undo today';

  @override
  String proof(Object type) {
    return 'Proof: $type';
  }

  @override
  String emoji(Object emoji) {
    return 'Emoji: $emoji';
  }

  @override
  String comment(Object comment) {
    return 'Comment: $comment';
  }

  @override
  String get copiedInviteCode => 'Copied invite code';

  @override
  String get copyCode => 'Copy code';

  @override
  String get share => 'Share';

  @override
  String shareText(Object code, Object name) {
    return 'Join my challenge \"$name\": code $code';
  }

  @override
  String membersCount(Object count) {
    return 'Members: $count';
  }

  @override
  String get reminderTitle => 'Reminder';

  @override
  String get dailyReminder => 'Daily reminder';

  @override
  String get localNotificationHint => 'Local notification (not push).';

  @override
  String get time => 'Time';

  @override
  String get notificationPermissionNotGranted =>
      'Notification permission not granted';

  @override
  String get saved => 'Saved';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get languageSystem => 'System';

  @override
  String get languageGerman => 'German';

  @override
  String get languageEnglish => 'English';

  @override
  String get appearance => 'Appearance';

  @override
  String get theme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get about => 'About';

  @override
  String get aboutSubtitle =>
      'MVP preview. Sync and real email codes come later.';
}
