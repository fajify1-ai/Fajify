import 'models.dart';

/// UI models, not published backend DTOs. Live adapters require D1 contracts.
abstract interface class BusinessRepository {
  Future<BusinessSnapshot> load(String businessId);
  Future<MerchantOrder> advanceOrder(String businessId, String orderId);
  Future<MenuItem> saveMenu(String businessId, MenuItem item);
  Future<void> setService(String businessId, String serviceId, bool enabled);
}

/// M2 seam. No password collection, fake JWT or client secret in the scaffold.
abstract interface class IdentityService {
  Future<BusinessIdentity?> restoreSession();
  Future<BusinessIdentity?> validateSession();
  Future<BusinessIdentity> signIn();
  Future<void> signOut();
}

class BusinessIdentity {
  const BusinessIdentity({
    required this.subject,
    required this.roles,
    this.businessMemberships = const {},
    this.membershipRoles = const {},
  });

  final String subject;
  final Set<String> roles;
  final Set<String> businessMemberships;
  final Map<String, String> membershipRoles;

  bool get canAccessBusiness => businessMemberships.isNotEmpty;

  factory BusinessIdentity.fromAuthResponse(Object? payload) {
    if (payload is! Map<String, dynamic> ||
        payload['subject'] is! String ||
        (payload['subject'] as String).isEmpty ||
        payload['roles'] is! List ||
        (payload['roles'] as List).any((role) => role is! String)) {
      throw const FormatException('Invalid identity response.');
    }

    final rawMemberships = payload['memberships'];
    if (rawMemberships != null &&
        (rawMemberships is! List ||
            rawMemberships.any((membership) {
              if (membership is! Map<String, dynamic>) return true;
              return membership['resourceType'] is! String ||
                  membership['resourceId'] is! String ||
                  (membership['resourceId'] as String).isEmpty ||
                  membership['role'] is! String ||
                  membership['status'] is! String;
            }))) {
      throw const FormatException('Invalid membership response.');
    }

    final membershipRoles = <String, String>{};
    for (final membership
        in (rawMemberships as List? ?? const []).cast<Map<String, dynamic>>()) {
      final resourceId = membership['resourceId'] as String;
      final role = membership['role'] as String;
      if (membership['resourceType'] == 'business' &&
          membership['status'] == 'approved' &&
          const {'owner', 'manager', 'staff'}.contains(role)) {
        membershipRoles[resourceId] = role;
      }
    }
    return BusinessIdentity(
      subject: payload['subject'] as String,
      roles: (payload['roles'] as List).cast<String>().toSet(),
      businessMemberships: membershipRoles.keys.toSet(),
      membershipRoles: membershipRoles,
    );
  }
}

class MockIdentityService implements IdentityService {
  BusinessIdentity? _identity;

  @override
  Future<BusinessIdentity?> restoreSession() async => null;

  @override
  Future<BusinessIdentity?> validateSession() async => _identity;

  @override
  Future<BusinessIdentity> signIn() async {
    _identity = const BusinessIdentity(
      subject: 'demo-subject',
      roles: {'merchant'},
      businessMemberships: {'demo-lagos'},
      membershipRoles: {'demo-lagos': 'owner'},
    );
    return _identity!;
  }

  @override
  Future<void> signOut() async {
    _identity = null;
  }
}

class DemoFailure implements Exception {
  const DemoFailure();
  @override
  String toString() => 'The sample request failed. Please try again.';
}

class DemoSessionReset implements Exception {
  const DemoSessionReset();
}

class MockBusinessRepository implements BusinessRepository {
  MockBusinessRepository({this.delay = const Duration(milliseconds: 250)});
  final Duration delay;
  DemoScenario scenario = DemoScenario.populated;
  bool failNextWrite = false;
  int _epoch = 0;
  final Map<String, BusinessSnapshot> _businesses = {};
  final Map<String, BusinessSnapshot> _emptyBusinesses = {};
  Map<String, BusinessSnapshot> get _store =>
      scenario == DemoScenario.empty ? _emptyBusinesses : _businesses;

  Future<void> _wait({bool write = false}) async {
    final epoch = _epoch;
    await Future<void>.delayed(delay);
    if (epoch != _epoch) throw const DemoSessionReset();
    if (scenario == DemoScenario.error || (write && failNextWrite)) {
      failNextWrite = false;
      throw const DemoFailure();
    }
  }

  BusinessSnapshot _get(String id) => _store.putIfAbsent(
    id,
    () =>
        scenario == DemoScenario.empty ? BusinessSnapshot.empty : fixtures(id),
  );

  void reset() {
    _epoch++;
    _businesses.clear();
    _emptyBusinesses.clear();
    scenario = DemoScenario.populated;
    failNextWrite = false;
  }

  @override
  Future<BusinessSnapshot> load(String businessId) async {
    await _wait();
    return _get(businessId);
  }

  @override
  Future<MerchantOrder> advanceOrder(String businessId, String orderId) async {
    await _wait(write: true);
    final data = _get(businessId);
    final current = data.orders.firstWhere((o) => o.id == orderId);
    final nextStage = switch (current.stage) {
      OrderStage.fresh || OrderStage.accepted => OrderStage.preparing,
      OrderStage.preparing => OrderStage.ready,
      OrderStage.ready => OrderStage.completed,
      OrderStage.completed || OrderStage.cancelled => null,
    };
    if (nextStage == null) {
      throw const DemoFailure();
    }
    final updated = current.withStage(nextStage);
    _store[businessId] = BusinessSnapshot(
      reservations: data.reservations,
      orders: List.unmodifiable(
        data.orders.map((o) => o.id == orderId ? updated : o),
      ),
      menu: data.menu,
      services: data.services,
    );
    return updated;
  }

  @override
  Future<MenuItem> saveMenu(String businessId, MenuItem item) async {
    await _wait(write: true);
    if (item.name.trim().isEmpty || item.amount <= 0 || item.category.isEmpty) {
      throw ArgumentError('A name, category and positive price are required.');
    }
    final data = _get(businessId);
    final items = data.menu.any((m) => m.id == item.id)
        ? data.menu.map((m) => m.id == item.id ? item : m).toList()
        : [...data.menu, item];
    _store[businessId] = BusinessSnapshot(
      reservations: data.reservations,
      orders: data.orders,
      menu: List.unmodifiable(items),
      services: data.services,
    );
    return item;
  }

  @override
  Future<void> setService(
    String businessId,
    String serviceId,
    bool enabled,
  ) async {
    await _wait(write: true);
    final data = _get(businessId);
    if (!data.services.any((s) => s.id == serviceId)) {
      throw ArgumentError('Unknown service.');
    }
    _store[businessId] = BusinessSnapshot(
      reservations: data.reservations,
      orders: data.orders,
      menu: data.menu,
      services: List.unmodifiable(
        data.services.map(
          (s) => s.id == serviceId ? s.withEnabled(enabled) : s,
        ),
      ),
    );
  }
}

BusinessSnapshot fixtures(String businessId) {
  final prefix = businessId == 'demo-island' ? 'Island' : 'Lagos';
  return BusinessSnapshot(
    reservations: List.unmodifiable([
      Reservation(
        'booking-1',
        '$prefix guest A',
        DateTime(2026, 8, 30),
        '7:00 PM',
        4,
      ),
      Reservation(
        'booking-2',
        '$prefix guest B',
        DateTime(2026, 8, 30),
        '8:00 PM',
        2,
        confirmed: false,
      ),
      Reservation(
        'booking-3',
        '$prefix guest C',
        DateTime(2026, 8, 31),
        '6:00 PM',
        2,
        confirmed: false,
      ),
      Reservation(
        'booking-4',
        '$prefix guest D',
        DateTime(2026, 8, 22),
        '6:30 PM',
        4,
      ),
    ]),
    orders: List.unmodifiable([
      MerchantOrder(
        'order-1',
        'Jollof Rice & Chicken',
        '$prefix guest A',
        1400000,
        OrderStage.fresh,
        2,
      ),
      MerchantOrder(
        'order-2',
        'Grilled Snapper + Drinks',
        '$prefix guest B',
        2200000,
        OrderStage.preparing,
        14,
      ),
      MerchantOrder(
        'order-3',
        'Starter Package Add-ons',
        '$prefix guest C',
        900000,
        OrderStage.ready,
        28,
      ),
      MerchantOrder(
        'order-4',
        'Lunch platter',
        '$prefix guest D',
        1800000,
        OrderStage.completed,
        60,
      ),
      MerchantOrder(
        'order-5',
        'Dinner for two',
        '$prefix guest E',
        3500000,
        OrderStage.completed,
        90,
      ),
    ]),
    menu: List.unmodifiable(const [
      MenuItem('menu-1', 'Grilled Snapper', 'Mains', 2200000),
      MenuItem('menu-2', 'Jollof Rice', 'Mains', 700000),
      MenuItem('menu-3', 'Suya Platter', 'Starters', 1200000),
      MenuItem(
        'menu-4',
        'Mocktail Pitcher',
        'Drinks',
        400000,
        available: false,
      ),
      MenuItem('menu-5', 'Champagne 750ml', 'Drinks', 4500000),
      MenuItem('menu-6', 'Dessert Platter', 'Desserts', 850000),
    ]),
    services: List.unmodifiable(const [
      BusinessCapability(
        'tables',
        'Table & Seat Reservations',
        'Let customers book in advance',
        true,
        'THIS MONTH',
        '86',
        'AVG. VALUE',
        3400000,
      ),
      BusinessCapability(
        'ordering',
        'In-Venue Ordering',
        'Table-side digital ordering',
        true,
        'ORDERS / WEEK',
        '142',
        'VIA ORDERING',
        89000000,
      ),
      BusinessCapability(
        'tickets',
        'Event Tickets',
        'Sell tickets right on Faji',
        false,
        'TICKETS',
        '0',
        'REVENUE',
        0,
      ),
      BusinessCapability(
        'delivery',
        'Delivery & Takeout',
        'Reach customers beyond your walls',
        false,
        'DELIVERIES',
        '0',
        'REVENUE',
        0,
      ),
      BusinessCapability(
        'rides',
        'Faji Ride Integration',
        'Guests arrive, stress-free',
        true,
        'RIDES / MONTH',
        '34',
        'RIDE REVENUE',
        28900000,
      ),
      BusinessCapability(
        'loyalty',
        'Loyalty & Rewards',
        'Keep them coming back',
        false,
        'MEMBERS',
        '0',
        'REWARDS',
        0,
      ),
      BusinessCapability(
        'packages',
        'Curated Date Packages',
        'Offer unforgettable experiences',
        true,
        'SOLD / MONTH',
        '58',
        'AVG. VALUE',
        7500000,
      ),
      BusinessCapability(
        'gifting',
        'Gifting & Add-ons',
        'The little extras that delight',
        false,
        'GIFTS',
        '0',
        'REVENUE',
        0,
      ),
    ]),
  );
}
