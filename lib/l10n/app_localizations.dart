import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en')
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Habit Challenge'**
  String get appName;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get commonContinue;

  /// No description provided for @commonCopied.
  ///
  /// In en, this message translates to:
  /// **'Copied'**
  String get commonCopied;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get loginTitle;

  /// No description provided for @loginHeroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Daily streaks with friends.\nOne code. One tap. Every day.'**
  String get loginHeroSubtitle;

  /// No description provided for @loginHint.
  ///
  /// In en, this message translates to:
  /// **'Enter your email. We\'ll send you a code.'**
  String get loginHint;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @codeRequested.
  ///
  /// In en, this message translates to:
  /// **'Code requested.'**
  String get codeRequested;

  /// No description provided for @codeLabel.
  ///
  /// In en, this message translates to:
  /// **'Code (6 digits)'**
  String get codeLabel;

  /// No description provided for @loginProceed.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get loginProceed;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String homeGreeting(Object name);

  /// No description provided for @homeReminder.
  ///
  /// In en, this message translates to:
  /// **'Reminder'**
  String get homeReminder;

  /// No description provided for @homeSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get homeSettings;

  /// No description provided for @homeLogout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get homeLogout;

  /// No description provided for @homeCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get homeCreate;

  /// No description provided for @homeJoinViaCode.
  ///
  /// In en, this message translates to:
  /// **'Join via code'**
  String get homeJoinViaCode;

  /// No description provided for @homeEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Create a group and invite friends'**
  String get homeEmptyTitle;

  /// No description provided for @homeEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Daily check-ins keep your streak alive.'**
  String get homeEmptySubtitle;

  /// No description provided for @homeHowItWorks.
  ///
  /// In en, this message translates to:
  /// **'How it works'**
  String get homeHowItWorks;

  /// No description provided for @homeStep1.
  ///
  /// In en, this message translates to:
  /// **'Create a group'**
  String get homeStep1;

  /// No description provided for @homeStep1Desc.
  ///
  /// In en, this message translates to:
  /// **'Pick a goal and reset time.'**
  String get homeStep1Desc;

  /// No description provided for @homeStep2.
  ///
  /// In en, this message translates to:
  /// **'Invite friends'**
  String get homeStep2;

  /// No description provided for @homeStep2Desc.
  ///
  /// In en, this message translates to:
  /// **'Share the invite code.'**
  String get homeStep2Desc;

  /// No description provided for @homeStep3.
  ///
  /// In en, this message translates to:
  /// **'Check in daily'**
  String get homeStep3;

  /// No description provided for @homeStep3Desc.
  ///
  /// In en, this message translates to:
  /// **'One tap a day keeps the streak.'**
  String get homeStep3Desc;

  /// No description provided for @createGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'Create group'**
  String get createGroupTitle;

  /// No description provided for @groupStyleLabel.
  ///
  /// In en, this message translates to:
  /// **'Style'**
  String get groupStyleLabel;

  /// No description provided for @groupStyleWorkout.
  ///
  /// In en, this message translates to:
  /// **'Workout'**
  String get groupStyleWorkout;

  /// No description provided for @groupStyleStreak.
  ///
  /// In en, this message translates to:
  /// **'Streak'**
  String get groupStyleStreak;

  /// No description provided for @nameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get nameLabel;

  /// No description provided for @amountOptional.
  ///
  /// In en, this message translates to:
  /// **'Number (optional)'**
  String get amountOptional;

  /// No description provided for @goalText.
  ///
  /// In en, this message translates to:
  /// **'Goal (text)'**
  String get goalText;

  /// No description provided for @startTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Start tomorrow'**
  String get startTomorrow;

  /// No description provided for @endless.
  ///
  /// In en, this message translates to:
  /// **'Endless'**
  String get endless;

  /// No description provided for @durationDays.
  ///
  /// In en, this message translates to:
  /// **'Duration (days)'**
  String get durationDays;

  /// No description provided for @dailyResetHour.
  ///
  /// In en, this message translates to:
  /// **'Daily reset hour'**
  String get dailyResetHour;

  /// No description provided for @createGroupButton.
  ///
  /// In en, this message translates to:
  /// **'Create group'**
  String get createGroupButton;

  /// No description provided for @createFailed.
  ///
  /// In en, this message translates to:
  /// **'Create failed: {error}'**
  String createFailed(Object error);

  /// No description provided for @joinChallengeTitle.
  ///
  /// In en, this message translates to:
  /// **'Join challenge'**
  String get joinChallengeTitle;

  /// No description provided for @pasteInviteCode.
  ///
  /// In en, this message translates to:
  /// **'Paste invite code from a friend:'**
  String get pasteInviteCode;

  /// No description provided for @inviteCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Invite code'**
  String get inviteCodeLabel;

  /// No description provided for @join.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get join;

  /// No description provided for @joinFailed.
  ///
  /// In en, this message translates to:
  /// **'Join failed: {error}'**
  String joinFailed(Object error);

  /// No description provided for @compareTitle.
  ///
  /// In en, this message translates to:
  /// **'Compare'**
  String get compareTitle;

  /// No description provided for @todayLabel.
  ///
  /// In en, this message translates to:
  /// **'Today: {todayKey}'**
  String todayLabel(Object todayKey);

  /// No description provided for @todayStatus.
  ///
  /// In en, this message translates to:
  /// **'Today status'**
  String get todayStatus;

  /// No description provided for @checkedInCount.
  ///
  /// In en, this message translates to:
  /// **'{done}/{total} checked in'**
  String checkedInCount(Object done, Object total);

  /// No description provided for @leaderboard.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get leaderboard;

  /// No description provided for @streak.
  ///
  /// In en, this message translates to:
  /// **'Streak: {streak}'**
  String streak(Object streak);

  /// No description provided for @streakAndTotal.
  ///
  /// In en, this message translates to:
  /// **'Streak: {streak} • Total: {total}'**
  String streakAndTotal(Object streak, Object total);

  /// No description provided for @youSuffix.
  ///
  /// In en, this message translates to:
  /// **'(you)'**
  String get youSuffix;

  /// No description provided for @friendLabel.
  ///
  /// In en, this message translates to:
  /// **'Friend {code}'**
  String friendLabel(Object code);

  /// No description provided for @challengeCompare.
  ///
  /// In en, this message translates to:
  /// **'Compare'**
  String get challengeCompare;

  /// No description provided for @challengeInvite.
  ///
  /// In en, this message translates to:
  /// **'Invite: {code}'**
  String challengeInvite(Object code);

  /// No description provided for @challengeReset.
  ///
  /// In en, this message translates to:
  /// **'Reset: {hour}:00'**
  String challengeReset(Object hour);

  /// No description provided for @challengeToday.
  ///
  /// In en, this message translates to:
  /// **'Today: {todayKey}'**
  String challengeToday(Object todayKey);

  /// No description provided for @yourStreak.
  ///
  /// In en, this message translates to:
  /// **'Your streak'**
  String get yourStreak;

  /// No description provided for @notAMember.
  ///
  /// In en, this message translates to:
  /// **'Not a member'**
  String get notAMember;

  /// No description provided for @streakBest.
  ///
  /// In en, this message translates to:
  /// **'{current} (best: {best})'**
  String streakBest(Object best, Object current);

  /// No description provided for @todayNotDone.
  ///
  /// In en, this message translates to:
  /// **'Today: not done yet'**
  String get todayNotDone;

  /// No description provided for @todayDone.
  ///
  /// In en, this message translates to:
  /// **'Today: done'**
  String get todayDone;

  /// No description provided for @tapCheckinHint.
  ///
  /// In en, this message translates to:
  /// **'Tap check-in to keep your streak.'**
  String get tapCheckinHint;

  /// No description provided for @checkin.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get checkin;

  /// No description provided for @undoToday.
  ///
  /// In en, this message translates to:
  /// **'Undo today'**
  String get undoToday;

  /// No description provided for @proof.
  ///
  /// In en, this message translates to:
  /// **'Proof: {type}'**
  String proof(Object type);

  /// No description provided for @emoji.
  ///
  /// In en, this message translates to:
  /// **'Emoji: {emoji}'**
  String emoji(Object emoji);

  /// No description provided for @comment.
  ///
  /// In en, this message translates to:
  /// **'Comment: {comment}'**
  String comment(Object comment);

  /// No description provided for @copiedInviteCode.
  ///
  /// In en, this message translates to:
  /// **'Copied invite code'**
  String get copiedInviteCode;

  /// No description provided for @copyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get copyCode;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @shareText.
  ///
  /// In en, this message translates to:
  /// **'Join my challenge \"{name}\": code {code}'**
  String shareText(Object code, Object name);

  /// No description provided for @membersCount.
  ///
  /// In en, this message translates to:
  /// **'Members: {count}'**
  String membersCount(Object count);

  /// No description provided for @reminderTitle.
  ///
  /// In en, this message translates to:
  /// **'Reminder'**
  String get reminderTitle;

  /// No description provided for @dailyReminder.
  ///
  /// In en, this message translates to:
  /// **'Daily reminder'**
  String get dailyReminder;

  /// No description provided for @localNotificationHint.
  ///
  /// In en, this message translates to:
  /// **'Local notification (not push).'**
  String get localNotificationHint;

  /// No description provided for @time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get time;

  /// No description provided for @notificationPermissionNotGranted.
  ///
  /// In en, this message translates to:
  /// **'Notification permission not granted'**
  String get notificationPermissionNotGranted;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get languageSystem;

  /// No description provided for @languageGerman.
  ///
  /// In en, this message translates to:
  /// **'German'**
  String get languageGerman;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @aboutSubtitle.
  ///
  /// In en, this message translates to:
  /// **'MVP preview. Sync and real email codes come later.'**
  String get aboutSubtitle;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['de', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
