import 'package:flutter/foundation.dart';

import 'business_api.dart';
import 'models.dart';
import 'services.dart';
import 'keycloak_identity_service.dart';

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
  String? selectedBranchId;
  MerchantBranch? get selectedBranch {
    for (final branch in branches) {
      if (branch.id == selectedBranchId) return branch;
    }
    return null;
  }

  String get businessName {
    final selected = branches.where((branch) => branch.id == selectedBranchId);
    if (selected.isNotEmpty) return selected.first.name;
    if (repository is BusinessApiRepository) return 'Business workspace';
    return businessId == 'demo-island' ? 'Demo Island' : 'Demo Lagos';
  }
  bool get isSample => repository is MockBusinessRepository;
  String? get membershipRole => account?.membershipRoles[businessId];
  bool get canManageBusiness =>
      isSample || membershipRole == 'owner' || membershipRole == 'manager';
  bool get isBusinessOwner => isSample || membershipRole == 'owner';
  List<MerchantAvailability> get availabilityRecords =>
      repository is BusinessApiRepository
      ? (repository as BusinessApiRepository).lastAvailability
      : const [];
  LoadState state = LoadState.loading;
  BusinessSnapshot data = BusinessSnapshot.empty;
  List<MerchantBranch> branches = const [];
  MerchantOverview? overview;
  BusinessIdentity? account;
  String? error;
  bool busy = false;
  bool signingIn = false;
  int _generation = 0;
  int _authGeneration = 0;
  bool _disposed = false;
  String? _lastValidatedDestination;
  Future<bool>? _accessCheck;
  int? _accessCheckGeneration;
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

  Future<void> _activateBusiness(BusinessIdentity identity) async {
    account = identity;
    if (!identity.canAccessBusiness) {
      session = SessionStatus.denied;
      return;
    }
    session = SessionStatus.merchant;
    if (repository is BusinessApiRepository) {
      final now = DateTime.now();
      calendarMonth = DateTime(now.year, now.month);
      selectedDate = DateTime(now.year, now.month, now.day);
      final live = repository as BusinessApiRepository;
      final availableBusinessIds = identity.businessMemberships.toList()
        ..sort();
      if (!availableBusinessIds.contains(businessId)) {
        businessId = availableBusinessIds.first;
      }
      if (identity.membershipRoles[businessId] == null) {
        session = SessionStatus.denied;
        return;
      }
      branches = await live.loadBranches(businessId);
      selectedBranchId = live.selectedBranchId;
      if (selectedBranchId == null) {
        data = BusinessSnapshot.empty;
        overview = await live.overview(businessId);
        state = LoadState.empty;
        error = 'This approved business has no active branches yet.';
        _emit();
        return;
      }
    }
    await reload();
  }

  Future<void> restoreSession() async {
    final generation = ++_generation;
    _authGeneration++;
    try {
      final restored = await identity.restoreSession();
      if (_disposed || generation != _generation || restored == null) return;
      _lastValidatedDestination = null;
      await _activateBusiness(restored);
      if (session == SessionStatus.denied) {
        error = 'The backend did not confirm an approved business membership.';
        _emit();
      }
    } on Exception catch (exception) {
      if (_disposed || generation != _generation) return;
      error = _identityError(exception);
      _emit();
    }
  }

  Future<void> signIn() => _authenticate();

  Future<void> _authenticate() async {
    if (signingIn) return;
    signingIn = true;
    error = null;
    final generation = ++_generation;
    _authGeneration++;
    _emit();
    try {
      final authenticated = await identity.signIn();
      if (_disposed || generation != _generation) return;
      _lastValidatedDestination = null;
      await _activateBusiness(authenticated);
      if (session == SessionStatus.denied) {
        error =
            'Your identity is verified, but the backend did not confirm an approved business membership.';
      }
    } on IdentityCancelled {
      error = null;
    } on Exception catch (exception) {
      if (_disposed || generation != _generation) return;
      error = _identityError(exception);
    } finally {
      if (!_disposed && generation == _generation) {
        signingIn = false;
        _emit();
      }
    }
  }

  Future<void> enterDemo({bool merchant = true}) async {
    if (signingIn) return;
    signingIn = true;
    error = null;
    final generation = ++_generation;
    _authGeneration++;
    _emit();
    try {
      final authenticated = await identity.signIn();
      if (_disposed || generation != _generation) return;
      account = authenticated;
      session = merchant ? SessionStatus.merchant : SessionStatus.denied;
    } on Exception catch (exception) {
      if (_disposed || generation != _generation) return;
      error = _identityError(exception);
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
    _authGeneration++;
    session = SessionStatus.signedOut;
    data = BusinessSnapshot.empty;
    state = LoadState.loading;
    busy = false;
    signingIn = false;
    error = null;
    _lastValidatedDestination = null;
    businessId = 'demo-lagos';
    selectedBranchId = null;
    branches = const [];
    overview = null;
    profileContact = 'merchant@example.test';
    account = null;
    calendarMonth = DateTime(2026, 8);
    selectedDate = DateTime(2026, 8, 30);
    calendarView = true;
    orderFilter = 'Active';
    checkedIn.clear();
    verifiedOrders.clear();
    if (repository is MockBusinessRepository) {
      (repository as MockBusinessRepository).reset();
    }
    if (repository is BusinessApiRepository) {
      (repository as BusinessApiRepository).selectBranch(null);
    }
    _emit();
    try {
      await identity.signOut();
    } on Exception catch (exception) {
      error = _identityError(exception);
      _emit();
    }
  }

  Future<bool> revalidateBusinessAccess({
    String? destination,
    bool force = false,
  }) async {
    if (session != SessionStatus.merchant) return false;
    if (!force &&
        destination != null &&
        destination == _lastValidatedDestination) {
      return true;
    }
    final authGeneration = _authGeneration;
    final existingCheck = _accessCheck;
    if (existingCheck != null &&
        _accessCheckGeneration == authGeneration) {
      return existingCheck;
    }

    final check = _performAccessCheck(destination, authGeneration);
    _accessCheck = check;
    _accessCheckGeneration = authGeneration;
    try {
      return await check;
    } finally {
      if (identical(_accessCheck, check)) {
        _accessCheck = null;
        _accessCheckGeneration = null;
      }
    }
  }

  Future<bool> _performAccessCheck(
    String? destination,
    int authGeneration,
  ) async {
    try {
      final validated = await identity.validateSession();
      if (_disposed ||
          authGeneration != _authGeneration ||
          session != SessionStatus.merchant) {
        return false;
      }
      if (validated == null ||
          !validated.canAccessBusiness ||
          !validated.businessMemberships.contains(businessId)) {
        session = SessionStatus.denied;
        error = 'Your account no longer has an approved business membership.';
        data = BusinessSnapshot.empty;
        state = LoadState.loading;
        checkedIn.clear();
        verifiedOrders.clear();
        _emit();
        return false;
      }
      account = validated;
      _lastValidatedDestination = destination;
      return true;
    } on Exception catch (exception) {
      if (!_disposed &&
          authGeneration == _authGeneration &&
          session == SessionStatus.merchant) {
        session = SessionStatus.denied;
        error = _identityError(exception);
        data = BusinessSnapshot.empty;
        state = LoadState.loading;
        checkedIn.clear();
        verifiedOrders.clear();
        _emit();
      }
      return false;
    }
  }

  Future<void> selectBusiness(String id) async {
    if (session != SessionStatus.merchant) return;
    if (repository is BusinessApiRepository) {
      if (account?.businessMemberships.contains(id) != true) return;
      final generation = ++_generation;
      businessId = id;
      selectedBranchId = null;
      data = BusinessSnapshot.empty;
      state = LoadState.loading;
      error = null;
      checkedIn.clear();
      verifiedOrders.clear();
      final live = repository as BusinessApiRepository;
      live.selectBranch(null);
      _emit();
      try {
        branches = await live.loadBranches(id);
        if (_disposed || generation != _generation || id != businessId) return;
        selectedBranchId = live.selectedBranchId;
        if (selectedBranchId == null) {
          overview = await live.overview(id);
          state = LoadState.empty;
          error = 'This approved business has no active branches yet.';
          _emit();
          return;
        }
        await reload();
      } on Exception catch (exception) {
        if (!_disposed && generation == _generation) {
          state = LoadState.error;
          await _handleRepositoryFailure(exception);
          _emit();
        }
      }
      return;
    }
    if (!['demo-lagos', 'demo-island'].contains(id)) return;
    _generation++;
    businessId = id;
    data = BusinessSnapshot.empty;
    busy = false;
    checkedIn.clear();
    verifiedOrders.clear();
    profileContact = 'merchant@example.test';
    await reload();
  }

  Future<void> selectBranch(String branchId) async {
    if (session != SessionStatus.merchant ||
        repository is! BusinessApiRepository ||
        !branches.any((branch) => branch.id == branchId && branch.active)) {
      return;
    }
    final live = repository as BusinessApiRepository;
    live.selectBranch(branchId);
    selectedBranchId = branchId;
    data = BusinessSnapshot.empty;
    checkedIn.clear();
    verifiedOrders.clear();
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
      if (repository is BusinessApiRepository) {
        overview = (repository as BusinessApiRepository).lastOverview;
      }
      state =
          snapshot.menu.isEmpty &&
              snapshot.orders.isEmpty &&
              snapshot.services.isEmpty
          ? LoadState.empty
          : LoadState.data;
    } on Exception catch (exception) {
      if (_disposed || generation != _generation) return;
      data = BusinessSnapshot.empty;
      state = LoadState.error;
      await _handleRepositoryFailure(exception);
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
      if (repository is BusinessApiRepository) {
        overview = (repository as BusinessApiRepository).lastOverview;
      }
      state = LoadState.data;
      return true;
    } on Exception catch (exception) {
      if (generation == _generation) {
        await _handleRepositoryFailure(exception);
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

  Future<bool> cancelOrder(String id) {
    if (repository is! BusinessApiRepository || selectedBranchId == null) {
      return Future.value(false);
    }
    return _write(
      (business) async => (repository as BusinessApiRepository).setOrderStatus(
        business,
        selectedBranchId!,
        id,
        'cancelled',
      ),
    );
  }

  Future<bool> saveMenu(MenuItem item) => _write((business) async {
    await repository.saveMenu(business, item);
  });
  Future<bool> setService(String id, bool enabled) =>
      _write((business) => repository.setService(business, id, enabled));

  Future<bool> setReservationStatus(String id, String status) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    final live = repository as BusinessApiRepository;
    return _write((business) async {
      await live.setReservation(business, id, status);
    });
  }

  Future<bool> setAvailabilityActive(String id, bool active) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    final live = repository as BusinessApiRepository;
    return _write((business) async {
      await live.setSlot(business, id, active);
    });
  }

  Future<bool> saveBranchHours(List<BranchHour> hours) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    final live = repository as BusinessApiRepository;
    return _write((business) async {
      await live.saveHours(business, hours);
    });
  }

  Future<bool> createAvailability(Map<String, Object?> input) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    final live = repository as BusinessApiRepository;
    return _write((business) async {
      final branchId = selectedBranchId;
      if (branchId == null) {
        throw const BusinessApiFailure(
          409,
          'Select an active branch before creating availability.',
        );
      }
      await live.createAvailability(business, branchId, input);
    });
  }

  Future<bool> updateBranch(Map<String, Object?> input) async {
    if (repository is! BusinessApiRepository || selectedBranchId == null) {
      return false;
    }
    final live = repository as BusinessApiRepository;
    final branchId = selectedBranchId!;
    return _liveMutation(() async {
      await live.updateBranch(businessId, branchId, input);
      branches = await live.loadBranches(businessId);
      selectedBranchId = live.selectedBranchId;
      return null;
    });
  }

  Future<bool> createBranch(Map<String, Object?> input) async {
    if (repository is! BusinessApiRepository) return false;
    final live = repository as BusinessApiRepository;
    return _liveMutation(() async {
      final created = await live.createBranch(businessId, input);
      branches = await live.loadBranches(businessId);
      live.selectBranch(created.id);
      selectedBranchId = created.id;
      return null;
    });
  }

  Future<List<MerchantStaffGrant>> loadStaff() async {
    if (repository is! BusinessApiRepository) return const [];
    try {
      return await (repository as BusinessApiRepository).staff(businessId);
    } on Exception catch (exception) {
      await _handleRepositoryFailure(exception);
      _emit();
      rethrow;
    }
  }

  Future<MerchantEventConfig> loadEventConfig(String itemId) async {
    final branchId = selectedBranchId;
    if (repository is! BusinessApiRepository || branchId == null) {
      throw const BusinessApiFailure(409, 'Select an active branch first.');
    }
    try {
      return await (repository as BusinessApiRepository).event(
        businessId,
        branchId,
        itemId,
      );
    } on Exception catch (exception) {
      if (exception is! BusinessApiFailure || exception.statusCode != 404) {
        await _handleRepositoryFailure(exception);
        _emit();
      }
      rethrow;
    }
  }

  Future<bool> configureEvent(
    String itemId,
    Map<String, Object?> input,
  ) {
    final branchId = selectedBranchId;
    if (repository is! BusinessApiRepository || branchId == null) {
      return Future.value(false);
    }
    return _liveMutation(
      () => (repository as BusinessApiRepository).configureEvent(
        businessId,
        branchId,
        itemId,
        input,
      ),
    );
  }

  Future<List<MerchantPackageComponent>> loadPackageComponents(
    String itemId,
  ) async {
    final branchId = selectedBranchId;
    if (repository is! BusinessApiRepository || branchId == null) {
      throw const BusinessApiFailure(409, 'Select an active branch first.');
    }
    try {
      return await (repository as BusinessApiRepository).packageComponents(
        businessId,
        branchId,
        itemId,
      );
    } on Exception catch (exception) {
      await _handleRepositoryFailure(exception);
      _emit();
      rethrow;
    }
  }

  Future<bool> savePackageComponents(
    String itemId,
    List<Map<String, Object>> components,
  ) {
    final branchId = selectedBranchId;
    if (repository is! BusinessApiRepository || branchId == null) {
      return Future.value(false);
    }
    return _liveMutation(
      () => (repository as BusinessApiRepository).replacePackageComponents(
        businessId,
        branchId,
        itemId,
        components,
      ),
    );
  }

  Future<bool> grantStaff({
    required String subject,
    required String role,
    String? branchId,
  }) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    return _liveMutation(
      () => (repository as BusinessApiRepository).grantStaff(
        businessId,
        subject: subject,
        role: role,
        branchId: branchId,
      ),
    );
  }

  Future<bool> revokeStaff({
    required String subject,
    required String role,
    String? branchId,
  }) {
    if (repository is! BusinessApiRepository) return Future.value(false);
    return _liveMutation(
      () => (repository as BusinessApiRepository).revokeStaff(
        businessId,
        subject: subject,
        role: role,
        branchId: branchId,
      ),
    );
  }

  Future<bool> _liveMutation(Future<Object?> Function() action) async {
    if (busy ||
        session != SessionStatus.merchant ||
        repository is! BusinessApiRepository) {
      return false;
    }
    final generation = _generation;
    final id = businessId;
    busy = true;
    error = null;
    _emit();
    try {
      await action();
      final snapshot = await repository.load(id);
      if (_disposed || generation != _generation || id != businessId) {
        return false;
      }
      data = snapshot;
      final live = repository as BusinessApiRepository;
      overview = live.lastOverview;
      state = snapshot.menu.isEmpty &&
              snapshot.orders.isEmpty &&
              snapshot.services.isEmpty
          ? LoadState.empty
          : LoadState.data;
      return true;
    } on Exception catch (exception) {
      if (generation == _generation) {
        await _handleRepositoryFailure(exception);
      }
      return false;
    } finally {
      if (!_disposed && generation == _generation) {
        busy = false;
        _emit();
      }
    }
  }

  Future<List<BranchHour>> loadBranchHours() async {
    if (repository is! BusinessApiRepository) return const [];
    try {
      return await (repository as BusinessApiRepository).loadHours(businessId);
    } on Exception catch (exception) {
      await _handleRepositoryFailure(exception);
      _emit();
      rethrow;
    }
  }

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

  String _identityError(Exception exception) => exception is IdentityFailure
      ? exception.message
      : 'Authentication could not be completed. Please try again.';

  String _repositoryError(Exception exception) =>
      exception is BusinessApiFailure
      ? exception.message
      : 'The Business request failed. Please retry.';

  Future<void> _handleRepositoryFailure(Exception exception) async {
    if (exception is BusinessApiFailure && exception.statusCode == 401) {
      await logout();
      return;
    }
    error = _repositoryError(exception);
  }
}
