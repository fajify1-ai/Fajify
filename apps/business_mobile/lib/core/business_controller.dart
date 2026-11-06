import 'package:flutter/foundation.dart';

import 'models.dart';
import 'services.dart';

enum SessionStatus { signedOut, merchant, denied }

class BusinessController extends ChangeNotifier {
  BusinessController({
    BusinessRepository? repository,
    IdentityService? identity,
  }) : repository = repository ?? MockBusinessRepository(),
       identity = identity ?? MockIdentityService();
  final BusinessRepository repository;
  final IdentityService identity;
  SessionStatus session = SessionStatus.signedOut;
  String businessId = 'demo-lagos';
  String get businessName =>
      businessId == 'demo-island' ? 'Demo Island' : 'Demo Lagos';
  LoadState state = LoadState.loading;
  BusinessSnapshot data = BusinessSnapshot.empty;
  String? error;
  bool busy = false;
  bool signingIn = false;
  int _generation = 0;
  bool _disposed = false;
  final Set<String> checkedIn = {};
  final Set<String> verifiedOrders = {};
  String profileContact = 'merchant@example.test';
  int _menuSequence = 100;
  DateTime calendarMonth = DateTime(2026, 8);
  DateTime selectedDate = DateTime(2026, 8, 30);
  bool calendarView = true;
  String orderFilter = 'Active';

  void _emit() {
    if (!_disposed) notifyListeners();
  }

  Future<void> enterDemo({bool merchant = true}) async {
    if (signingIn) return;
    signingIn = true;
    error = null;
    final generation = _generation;
    _emit();
    try {
      await identity.signIn();
      if (_disposed || generation != _generation) return;
      session = merchant ? SessionStatus.merchant : SessionStatus.denied;
    } catch (_) {
      error = 'Demo sign-in failed. Please try again.';
    } finally {
      if (!_disposed && generation == _generation) {
        signingIn = false;
        _emit();
      }
    }
    if (session == SessionStatus.merchant) await reload();
  }

  Future<void> logout() async {
    _generation++;
    session = SessionStatus.signedOut;
    data = BusinessSnapshot.empty;
    state = LoadState.loading;
    busy = false;
    signingIn = false;
    error = null;
    businessId = 'demo-lagos';
    profileContact = 'merchant@example.test';
    calendarMonth = DateTime(2026, 8);
    selectedDate = DateTime(2026, 8, 30);
    calendarView = true;
    orderFilter = 'Active';
    checkedIn.clear();
    verifiedOrders.clear();
    if (repository is MockBusinessRepository) {
      (repository as MockBusinessRepository).reset();
    }
    _emit();
    await identity.signOut();
  }

  Future<void> selectBusiness(String id) async {
    if (session != SessionStatus.merchant ||
        !['demo-lagos', 'demo-island'].contains(id)) {
      return;
    }
    _generation++;
    businessId = id;
    data = BusinessSnapshot.empty;
    busy = false;
    checkedIn.clear();
    verifiedOrders.clear();
    profileContact = 'merchant@example.test';
    await reload();
  }

  Future<void> reload() async {
    if (session != SessionStatus.merchant) return;
    final generation = ++_generation;
    final id = businessId;
    state = LoadState.loading;
    error = null;
    _emit();
    try {
      final snapshot = await repository.load(id);
      if (_disposed || generation != _generation || id != businessId) return;
      data = snapshot;
      state =
          snapshot.menu.isEmpty &&
              snapshot.orders.isEmpty &&
              snapshot.services.isEmpty
          ? LoadState.empty
          : LoadState.data;
    } catch (_) {
      if (_disposed || generation != _generation) return;
      data = BusinessSnapshot.empty;
      state = LoadState.error;
      error = 'We could not load the sample data. Try again.';
    }
    if (generation == _generation) _emit();
  }

  Future<bool> _write(Future<void> Function(String) action) async {
    if (busy ||
        session != SessionStatus.merchant ||
        state == LoadState.loading) {
      return false;
    }
    final generation = _generation;
    final id = businessId;
    busy = true;
    error = null;
    _emit();
    try {
      await action(id);
      final snapshot = await repository.load(id);
      if (_disposed || generation != _generation || id != businessId) {
        return false;
      }
      data = snapshot;
      state = LoadState.data;
      return true;
    } catch (_) {
      if (generation == _generation) {
        error = 'Sample change failed. Nothing was confirmed. Please retry.';
      }
      return false;
    } finally {
      if (!_disposed && generation == _generation) {
        busy = false;
        _emit();
      }
    }
  }

  Future<bool> advance(String id) => _write((business) async {
    await repository.advanceOrder(business, id);
  });
  Future<bool> saveMenu(MenuItem item) => _write((business) async {
    await repository.saveMenu(business, item);
  });
  Future<bool> setService(String id, bool enabled) =>
      _write((business) => repository.setService(business, id, enabled));
  String nextMenuId() => 'menu-local-${_menuSequence++}';

  Future<void> scenario(DemoScenario scenario) async {
    if (busy) return;
    final repo = repository;
    if (repo is MockBusinessRepository) {
      repo.scenario = scenario;
      await reload();
    }
  }

  Future<void> reset() async {
    if (busy) return;
    if (repository is MockBusinessRepository) {
      (repository as MockBusinessRepository).reset();
    }
    checkedIn.clear();
    verifiedOrders.clear();
    await reload();
  }

  String scan({required bool order, required String code}) {
    if (session != SessionStatus.merchant || state != LoadState.data) {
      return 'Sample session unavailable.';
    }
    if (code == 'FAIL') return 'Sample scanner unavailable. Try again.';
    if (code == 'USED') return 'This sample code has already been used.';
    final exists = order
        ? data.orders.any((o) => o.id == code)
        : data.reservations.any((r) => r.id == code);
    if (!exists) return 'Invalid sample code for this business and scan type.';
    final used = order ? verifiedOrders : checkedIn;
    if (!used.add('$businessId:$code')) {
      return 'This sample code has already been used.';
    }
    _emit();
    return order
        ? 'Demo recipient verified locally. No live order was fulfilled.'
        : 'Demo guest checked in locally. No real admission was recorded.';
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    super.dispose();
  }
}
