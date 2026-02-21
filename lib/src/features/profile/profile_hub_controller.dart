import 'package:flutter/foundation.dart';

import '../../data/local_store.dart';
import '../gym/gym_controller.dart';
import '../metrics/weight_controller.dart';
import 'basic_info_controller.dart';

class ProfileHubController extends ChangeNotifier {
  ProfileHubController({required LocalStore store})
      : basicInfo = BasicInfoController(store: store),
        weight = WeightController(store: store),
        gym = GymController(store: store);

  final BasicInfoController basicInfo;
  final WeightController weight;
  final GymController gym;

  bool _isReady = false;
  bool get isReady => _isReady;

  Future<void> load() async {
    await Future.wait([
      basicInfo.load(),
      weight.load(),
      gym.load(),
    ]);
    _isReady = true;
    notifyListeners();
  }
}
