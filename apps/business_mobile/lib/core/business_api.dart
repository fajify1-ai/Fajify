import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';
import 'models.dart' as ui;
import 'services.dart' as services;

typedef AccessTokenProvider = Future<String> Function();

class BusinessApiFailure implements Exception {
  const BusinessApiFailure(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

class BusinessApiClient {
  BusinessApiClient(
    this.config, {
    required AccessTokenProvider accessToken,
    http.Client? client,
  }) : _accessToken = accessToken,
       _client = client ?? http.Client();

  final BusinessConfig config;
  final AccessTokenProvider _accessToken;
  final http.Client _client;

  Future<Object?> get(List<String> segments) => _request('GET', segments);

  Future<Object?> post(List<String> segments, [Object? body]) =>
      _request('POST', segments, body);

  Future<Object?> patch(List<String> segments, [Object? body]) =>
      _request('PATCH', segments, body);

  Future<Object?> _request(
    String method,
    List<String> segments, [
    Object? body,
  ]) async {
    final token = await _accessToken();
    final path = segments.map(Uri.encodeComponent).join('/');
    final uri = Uri.parse(config.apiBaseUrl).resolve('/api/v1/$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      if (body != null) 'Content-Type': 'application/json',
    };

    try {
      final request = http.Request(method, uri)
        ..headers.addAll(headers)
        ..body = body == null ? '' : jsonEncode(body);
      final streamed = await _client.send(request).timeout(
        const Duration(seconds: 15),
      );
      final response = await http.Response.fromStream(streamed);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw BusinessApiFailure(
          response.statusCode,
          _errorMessage(response),
        );
      }
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } on FormatException {
        throw const BusinessApiFailure(
          502,
          'The Business API returned an invalid response.',
        );
      }
    } on BusinessApiFailure {
      rethrow;
    } on http.ClientException {
      throw const BusinessApiFailure(
        0,
        'Could not reach the Business API. Check your connection and retry.',
      );
    } on TimeoutException {
      throw const BusinessApiFailure(
        0,
        'The Business API did not respond in time. Retry the request.',
      );
    }
  }

  String _errorMessage(http.Response response) {
    try {
      final payload = jsonDecode(response.body);
      if (payload is Map<String, dynamic>) {
        final message = payload['message'];
        if (message is String && message.trim().isNotEmpty) return message;
        if (message is List && message.every((item) => item is String)) {
          return message.join('\n');
        }
      }
    } on FormatException {
      // Use the status-specific message when the server body is not JSON.
    }
    return switch (response.statusCode) {
      400 => 'The request was not accepted. Check the entered values.',
      401 => 'Your session expired. Sign in again.',
      403 => 'You do not have permission for this business action.',
      404 => 'This business record is no longer available.',
      409 => 'The record changed or the requested transition is not allowed.',
      >= 500 => 'The Business API is temporarily unavailable. Retry later.',
      _ => 'The Business API request failed (${response.statusCode}).',
    };
  }
}

class MerchantBranch {
  const MerchantBranch({
    required this.id,
    required this.businessId,
    required this.name,
    required this.active,
    required this.timezone,
    this.address,
    this.contactEmail,
  });

  final String id;
  final String businessId;
  final String name;
  final bool active;
  final String timezone;
  final String? address;
  final String? contactEmail;

  factory MerchantBranch.fromJson(Map<String, dynamic> json) => MerchantBranch(
    id: _string(json, 'id'),
    businessId: _string(json, 'business_id'),
    name: _string(json, 'name'),
    active: _boolean(json, 'active'),
    timezone: _string(json, 'timezone'),
    address: _optionalString(json, 'address'),
    contactEmail: _optionalString(json, 'contact_email'),
  );
}

class MerchantCatalogueItem {
  const MerchantCatalogueItem({
    required this.id,
    required this.name,
    required this.kind,
    required this.priceMinor,
    required this.currency,
    required this.published,
    required this.active,
    this.description,
  });

  final String id;
  final String name;
  final String kind;
  final int priceMinor;
  final String currency;
  final bool published;
  final bool active;
  final String? description;

  factory MerchantCatalogueItem.fromJson(Map<String, dynamic> json) =>
      MerchantCatalogueItem(
        id: _string(json, 'id'),
        name: _string(json, 'name'),
        kind: _string(json, 'kind'),
        priceMinor: _integer(json, 'price_minor'),
        currency: _string(json, 'currency'),
        published: _boolean(json, 'published'),
        active: _boolean(json, 'active'),
        description: _optionalString(json, 'description'),
      );
}

class MerchantAvailability {
  const MerchantAvailability({
    required this.id,
    required this.catalogueId,
    required this.startsAt,
    required this.endsAt,
    required this.capacity,
    required this.reserved,
    required this.active,
  });

  final String id;
  final String catalogueId;
  final DateTime startsAt;
  final DateTime endsAt;
  final int capacity;
  final int reserved;
  final bool active;

  factory MerchantAvailability.fromJson(Map<String, dynamic> json) =>
      MerchantAvailability(
        id: _string(json, 'id'),
        catalogueId: _string(json, 'catalogue_id'),
        startsAt: _dateTime(json, 'starts_at'),
        endsAt: _dateTime(json, 'ends_at'),
        capacity: _integer(json, 'capacity'),
        reserved: _integer(json, 'reserved'),
        active: _boolean(json, 'active'),
      );
}

class MerchantReservation {
  const MerchantReservation({
    required this.id,
    required this.availabilityId,
    required this.customerSubject,
    required this.guests,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String availabilityId;
  final String customerSubject;
  final int guests;
  final String status;
  final DateTime createdAt;

  factory MerchantReservation.fromJson(Map<String, dynamic> json) =>
      MerchantReservation(
        id: _string(json, 'id'),
        availabilityId: _string(json, 'availability_id'),
        customerSubject: _string(json, 'customer_subject'),
        guests: _integer(json, 'guests'),
        status: _string(json, 'status'),
        createdAt: _dateTime(json, 'created_at'),
      );
}

class MerchantOrder {
  const MerchantOrder({
    required this.id,
    required this.customerSubject,
    required this.status,
    required this.totalMinor,
    required this.currency,
    required this.createdAt,
  });

  final String id;
  final String customerSubject;
  final String status;
  final int totalMinor;
  final String currency;
  final DateTime createdAt;

  factory MerchantOrder.fromJson(Map<String, dynamic> json) => MerchantOrder(
    id: _string(json, 'id'),
    customerSubject: _string(json, 'customer_subject'),
    status: _string(json, 'status'),
    totalMinor: _integer(json, 'total_minor'),
    currency: _string(json, 'currency'),
    createdAt: _dateTime(json, 'created_at'),
  );
}

class BranchHour {
  const BranchHour(this.weekday, this.opensMinute, this.closesMinute);

  final int weekday;
  final int opensMinute;
  final int closesMinute;

  factory BranchHour.fromJson(Map<String, dynamic> json) => BranchHour(
    _integer(json, 'weekday'),
    _integer(json, 'opens_minute'),
    _integer(json, 'closes_minute'),
  );

  Map<String, int> toJson() => {
    'weekday': weekday,
    'opensMinute': opensMinute,
    'closesMinute': closesMinute,
  };
}

class MerchantStaffGrant {
  const MerchantStaffGrant({
    required this.subject,
    required this.resourceType,
    required this.resourceId,
    required this.role,
    required this.active,
  });

  final String subject;
  final String resourceType;
  final String resourceId;
  final String role;
  final bool active;

  factory MerchantStaffGrant.fromJson(Map<String, dynamic> json) =>
      MerchantStaffGrant(
        subject: _string(json, 'identity_subject'),
        resourceType: _string(json, 'resource_type'),
        resourceId: _string(json, 'resource_id'),
        role: _string(json, 'role'),
        active: _boolean(json, 'active'),
      );
}

class MerchantEventConfig {
  const MerchantEventConfig({
    required this.startsAt,
    required this.endsAt,
    required this.maxGuests,
  });

  final DateTime startsAt;
  final DateTime endsAt;
  final int maxGuests;

  factory MerchantEventConfig.fromJson(Map<String, dynamic> json) =>
      MerchantEventConfig(
        startsAt: _dateTime(json, 'starts_at'),
        endsAt: _dateTime(json, 'ends_at'),
        maxGuests: _integer(json, 'max_guests'),
      );
}

class MerchantPackageComponent {
  const MerchantPackageComponent({
    required this.catalogueId,
    required this.quantity,
  });

  final String catalogueId;
  final int quantity;

  factory MerchantPackageComponent.fromJson(Map<String, dynamic> json) =>
      MerchantPackageComponent(
        catalogueId: _string(json, 'component_id'),
        quantity: _integer(json, 'quantity'),
      );
}

class MerchantOverview {
  const MerchantOverview({
    required this.branches,
    required this.catalogueItems,
    required this.reservations,
    required this.orders,
    required this.fulfilledOrderTotalMinor,
  });

  final int branches;
  final int catalogueItems;
  final int reservations;
  final int orders;

  /// Fulfilled order value, not settled or withdrawable revenue.
  final int fulfilledOrderTotalMinor;

  factory MerchantOverview.fromJson(Map<String, dynamic> json) =>
      MerchantOverview(
        branches: _integer(json, 'branches'),
        catalogueItems: _integer(json, 'catalogue_items'),
        reservations: _integer(json, 'reservations'),
        orders: _integer(json, 'orders'),
        fulfilledOrderTotalMinor: _integer(
          json,
          'fulfilled_order_total_minor',
        ),
      );
}

class BusinessApiRepository implements services.BusinessRepository {
  BusinessApiRepository(this.api);

  final BusinessApiClient api;
  String? selectedBranchId;
  MerchantOverview? lastOverview;
  List<MerchantBranch> lastBranches = const [];
  List<MerchantAvailability> lastAvailability = const [];
  Map<String, MerchantOrder> _ordersById = const {};

  void selectBranch(String? branchId) {
    if (selectedBranchId != branchId) {
      lastAvailability = const [];
      _ordersById = const {};
    }
    selectedBranchId = branchId;
  }

  Future<List<MerchantBranch>> loadBranches(String businessId) async {
    lastBranches = await branches(businessId);
    if (!lastBranches.any(
      (branch) => branch.id == selectedBranchId && branch.active,
    )) {
      final nextBranch = lastBranches
          .where((branch) => branch.active)
          .firstOrNull
          ?.id;
      selectBranch(nextBranch);
    }
    return lastBranches;
  }

  @override
  Future<ui.BusinessSnapshot> load(String businessId) async {
    final branchId = selectedBranchId;
    if (branchId == null) {
      lastOverview = await overview(businessId);
      return ui.BusinessSnapshot.empty;
    }
    final values = await Future.wait<Object>([
      catalogue(businessId, branchId),
      availability(businessId, branchId),
      reservations(businessId, branchId),
      orders(businessId, branchId),
      overview(businessId),
    ]);
    final items = values[0] as List<MerchantCatalogueItem>;
    lastAvailability = values[1] as List<MerchantAvailability>;
    final reservationRows = values[2] as List<MerchantReservation>;
    final orderRows = values[3] as List<MerchantOrder>;
    lastOverview = values[4] as MerchantOverview;
    _ordersById = {for (final order in orderRows) order.id: order};
    final starts = {
      for (final slot in lastAvailability) slot.id: slot.startsAt,
    };
    return ui.BusinessSnapshot(
      reservations: reservationRows
          .map(
            (reservation) => ui.Reservation(
              reservation.id,
              'Customer',
              starts[reservation.availabilityId] ?? reservation.createdAt,
              _timeLabel(
                starts[reservation.availabilityId] ?? reservation.createdAt,
              ),
              reservation.guests,
              confirmed: reservation.status == 'confirmed',
              status: reservation.status,
            ),
          )
          .toList(growable: false),
      orders: orderRows
          .map(
            (order) => ui.MerchantOrder(
              order.id,
              'Order',
              'Customer',
              order.totalMinor,
              _orderStage(order.status),
              _minutesAgo(order.createdAt),
              currency: order.currency,
              status: order.status,
            ),
          )
          .toList(growable: false),
      menu: items
          .where((item) => item.kind != 'service')
          .map(
            (item) => ui.MenuItem(
              item.id,
              item.name,
              _kindLabel(item.kind),
              item.priceMinor,
              available: item.active && item.published,
              kind: item.kind,
              description: item.description,
              currency: item.currency,
              active: item.active,
            ),
          )
          .toList(growable: false),
      services: items
          .where((item) => item.kind == 'service')
          .map(
            (item) => ui.BusinessCapability(
              item.id,
              item.name,
              item.description ?? 'Merchant service',
              item.active && item.published,
              'Availability',
              item.active && item.published ? 'Published' : 'Not published',
              'Price',
              item.priceMinor,
            ),
          )
          .toList(growable: false),
    );
  }

  @override
  Future<ui.MerchantOrder> advanceOrder(
    String businessId,
    String orderId,
  ) async {
    final branchId = _requireBranch();
    var order = _ordersById[orderId];
    order ??= (await orders(businessId, branchId))
        .where((candidate) => candidate.id == orderId)
        .firstOrNull;
    if (order == null) {
      throw const BusinessApiFailure(404, 'Order is no longer available.');
    }
    final next = switch (order.status) {
      'placed' => 'accepted',
      'accepted' => 'preparing',
      'preparing' => 'ready',
      'ready' => 'fulfilled',
      _ => throw const BusinessApiFailure(
        409,
        'This order cannot be advanced from its current status.',
      ),
    };
    final updated = await setOrderStatus(businessId, branchId, orderId, next);
    _ordersById = {..._ordersById, orderId: updated};
    return ui.MerchantOrder(
      updated.id,
      'Order',
      'Customer',
      updated.totalMinor,
      _orderStage(updated.status),
      _minutesAgo(updated.createdAt),
      currency: updated.currency,
      status: updated.status,
    );
  }

  @override
  Future<ui.MenuItem> saveMenu(String businessId, ui.MenuItem item) async {
    final branchId = _requireBranch();
    final body = <String, Object?>{
      'name': item.name.trim(),
      'kind': item.kind,
      'priceMinor': item.amount,
      'currency': item.currency,
      'published': item.available,
    };
    final saved = item.id.startsWith('menu-local-')
        ? await createCatalogueItem(businessId, branchId, body)
        : await updateCatalogueItem(
            businessId,
            branchId,
            item.id,
            {
              'name': body['name'],
              'priceMinor': body['priceMinor'],
              'published': body['published'],
              'active': item.active,
            },
          );
    return ui.MenuItem(
      saved.id,
      saved.name,
      _kindLabel(saved.kind),
      saved.priceMinor,
      available: saved.published,
      kind: saved.kind,
      description: saved.description,
      currency: saved.currency,
      active: saved.active,
    );
  }

  @override
  Future<void> setService(
    String businessId,
    String serviceId,
    bool enabled,
  ) async {
    final branchId = _requireBranch();
    await updateCatalogueItem(
      businessId,
      branchId,
      serviceId,
      {'active': enabled, 'published': enabled},
    );
  }

  Future<MerchantReservation> setReservation(
    String businessId,
    String reservationId,
    String status,
  ) => setReservationStatus(
    businessId,
    _requireBranch(),
    reservationId,
    status,
  );

  Future<MerchantAvailability> setSlot(
    String businessId,
    String slotId,
    bool active,
  ) => setAvailabilityActive(
    businessId,
    _requireBranch(),
    slotId,
    active,
  );

  Future<List<BranchHour>> loadHours(String businessId) =>
      hours(businessId, _requireBranch());

  Future<Object?> saveHours(String businessId, List<BranchHour> values) =>
      replaceHours(businessId, _requireBranch(), values);

  String _requireBranch() {
    final branch = selectedBranchId;
    if (branch == null) {
      throw const BusinessApiFailure(
        409,
        'Select an active branch before managing its operations.',
      );
    }
    return branch;
  }

  static ui.OrderStage _orderStage(String status) => switch (status) {
    'placed' => ui.OrderStage.fresh,
    'accepted' => ui.OrderStage.accepted,
    'preparing' => ui.OrderStage.preparing,
    'ready' => ui.OrderStage.ready,
    'fulfilled' => ui.OrderStage.completed,
    _ => ui.OrderStage.cancelled,
  };

  static String _kindLabel(String kind) => switch (kind) {
    'product' => 'Product',
    'service' => 'Service',
    'package' => 'Package',
    'event' => 'Event',
    _ => kind,
  };

  static int _minutesAgo(DateTime value) =>
      DateTime.now()
          .difference(value.toLocal())
          .inMinutes
          .clamp(0, 1000000)
          .toInt();

  static String _timeLabel(DateTime value) {
    final local = value.toLocal();
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    return '$hour:$minute ${local.hour < 12 ? 'AM' : 'PM'}';
  }

  Future<List<MerchantBranch>> branches(String businessId) async =>
      _list(await api.get(['businesses', businessId, 'branches']))
          .map(MerchantBranch.fromJson)
          .toList(growable: false);

  Future<MerchantBranch> createBranch(
    String businessId,
    Map<String, Object?> input,
  ) async => MerchantBranch.fromJson(
    _map(await api.post(['businesses', businessId, 'branches'], input)),
  );

  Future<MerchantBranch> updateBranch(
    String businessId,
    String branchId,
    Map<String, Object?> input,
  ) async => MerchantBranch.fromJson(
    _map(
      await api.patch(['businesses', businessId, 'branches', branchId], input),
    ),
  );

  Future<List<MerchantCatalogueItem>> catalogue(
    String businessId,
    String branchId,
  ) async =>
      _list(
        await api.get([
          'businesses',
          businessId,
          'branches',
          branchId,
          'catalogue',
        ]),
      ).map(MerchantCatalogueItem.fromJson).toList(growable: false);

  Future<MerchantCatalogueItem> createCatalogueItem(
    String businessId,
    String branchId,
    Map<String, Object?> input,
  ) async => MerchantCatalogueItem.fromJson(
    _map(
      await api.post([
        'businesses',
        businessId,
        'branches',
        branchId,
        'catalogue',
      ], input),
    ),
  );

  Future<MerchantCatalogueItem> updateCatalogueItem(
    String businessId,
    String branchId,
    String itemId,
    Map<String, Object?> input,
  ) async => MerchantCatalogueItem.fromJson(
    _map(
      await api.patch([
        'businesses',
        businessId,
        'branches',
        branchId,
        'catalogue',
        itemId,
      ], input),
    ),
  );

  Future<List<MerchantAvailability>> availability(
    String businessId,
    String branchId,
  ) async =>
      _list(
        await api.get([
          'businesses',
          businessId,
          'branches',
          branchId,
          'availability',
        ]),
      ).map(MerchantAvailability.fromJson).toList(growable: false);

  Future<MerchantAvailability> createAvailability(
    String businessId,
    String branchId,
    Map<String, Object?> input,
  ) async => MerchantAvailability.fromJson(
    _map(
      await api.post([
        'businesses',
        businessId,
        'branches',
        branchId,
        'availability',
      ], input),
    ),
  );

  Future<MerchantAvailability> setAvailabilityActive(
    String businessId,
    String branchId,
    String slotId,
    bool active,
  ) async => MerchantAvailability.fromJson(
    _map(
      await api.patch([
        'businesses',
        businessId,
        'branches',
        branchId,
        'availability',
        slotId,
      ], {'active': active}),
    ),
  );

  Future<List<MerchantReservation>> reservations(
    String businessId,
    String branchId,
  ) async =>
      _list(
        await api.get([
          'businesses',
          businessId,
          'branches',
          branchId,
          'reservations',
        ]),
      ).map(MerchantReservation.fromJson).toList(growable: false);

  Future<MerchantReservation> setReservationStatus(
    String businessId,
    String branchId,
    String reservationId,
    String status,
  ) async => MerchantReservation.fromJson(
    _map(
      await api.patch([
        'businesses',
        businessId,
        'branches',
        branchId,
        'reservations',
        reservationId,
        'status',
      ], {'status': status}),
    ),
  );

  Future<List<MerchantOrder>> orders(String businessId, String branchId) async =>
      _list(
        await api.get([
          'businesses',
          businessId,
          'branches',
          branchId,
          'orders',
        ]),
      ).map(MerchantOrder.fromJson).toList(growable: false);

  Future<MerchantOrder> setOrderStatus(
    String businessId,
    String branchId,
    String orderId,
    String status,
  ) async => MerchantOrder.fromJson(
    _map(
      await api.patch([
        'businesses',
        businessId,
        'branches',
        branchId,
        'orders',
        orderId,
        'status',
      ], {'status': status}),
    ),
  );

  Future<List<BranchHour>> hours(String businessId, String branchId) async =>
      _list(
        await api.get([
          'businesses',
          businessId,
          'branches',
          branchId,
          'hours',
        ]),
      ).map(BranchHour.fromJson).toList(growable: false);

  Future<Object?> replaceHours(
    String businessId,
    String branchId,
    List<BranchHour> hours,
  ) => api.patch([
    'businesses',
    businessId,
    'branches',
    branchId,
    'hours',
  ], {
    'slots': hours.map((hour) => hour.toJson()).toList(growable: false),
  });

  Future<MerchantEventConfig> event(
    String businessId,
    String branchId,
    String itemId,
  ) async => MerchantEventConfig.fromJson(
    _map(
      await api.get([
        'businesses',
        businessId,
        'branches',
        branchId,
        'events',
        itemId,
      ]),
    ),
  );

  Future<MerchantEventConfig> configureEvent(
    String businessId,
    String branchId,
    String itemId,
    Map<String, Object?> input,
  ) async => MerchantEventConfig.fromJson(
    _map(
      await api.patch([
        'businesses',
        businessId,
        'branches',
        branchId,
        'events',
        itemId,
      ], input),
    ),
  );

  Future<List<MerchantPackageComponent>> packageComponents(
    String businessId,
    String branchId,
    String itemId,
  ) async => _list(
    await api.get([
      'businesses',
      businessId,
      'branches',
      branchId,
      'packages',
      itemId,
    ]),
  ).map(MerchantPackageComponent.fromJson).toList(growable: false);

  Future<Object?> replacePackageComponents(
    String businessId,
    String branchId,
    String itemId,
    List<Map<String, Object>> components,
  ) => api.patch([
    'businesses',
    businessId,
    'branches',
    branchId,
    'packages',
    itemId,
  ], {'components': components});

  Future<MerchantOverview> overview(String businessId) async =>
      MerchantOverview.fromJson(
        _map(await api.get(['businesses', businessId, 'overview'])),
      );

  Future<List<MerchantStaffGrant>> staff(String businessId) async =>
      _list(await api.get(['businesses', businessId, 'staff']))
          .map(MerchantStaffGrant.fromJson)
          .toList(growable: false);

  Future<Object?> grantStaff(
    String businessId, {
    required String subject,
    required String role,
    String? branchId,
  }) => api.post(['businesses', businessId, 'staff', 'grants'], {
    'subject': subject,
    'role': role,
    if (branchId != null) 'branchId': branchId,
  });

  Future<Object?> revokeStaff(
    String businessId, {
    required String subject,
    required String role,
    String? branchId,
  }) => api.post(['businesses', businessId, 'staff', 'revocations'], {
    'subject': subject,
    'role': role,
    if (branchId != null) 'branchId': branchId,
  });
}

List<Map<String, dynamic>> _list(Object? value) {
  if (value is! List || value.any((item) => item is! Map<String, dynamic>)) {
    throw const BusinessApiFailure(
      502,
      'The Business API returned an invalid list response.',
    );
  }
  return value.cast<Map<String, dynamic>>();
}

Map<String, dynamic> _map(Object? value) {
  if (value is! Map<String, dynamic>) {
    throw const BusinessApiFailure(
      502,
      'The Business API returned an invalid record response.',
    );
  }
  return value;
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) {
    throw BusinessApiFailure(502, 'The Business API returned invalid "$key".');
  }
  return value;
}

String? _optionalString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) {
    throw BusinessApiFailure(502, 'The Business API returned invalid "$key".');
  }
  return value;
}

int _integer(Map<String, dynamic> json, String key) {
  final value = json[key];
  final parsed = value is int ? value : int.tryParse('$value');
  if (parsed == null || parsed < 0) {
    throw BusinessApiFailure(502, 'The Business API returned invalid "$key".');
  }
  return parsed;
}

bool _boolean(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! bool) {
    throw BusinessApiFailure(502, 'The Business API returned invalid "$key".');
  }
  return value;
}

DateTime _dateTime(Map<String, dynamic> json, String key) {
  final raw = _string(json, key);
  final value = DateTime.tryParse(raw);
  if (value == null) {
    throw BusinessApiFailure(502, 'The Business API returned invalid "$key".');
  }
  return value;
}
