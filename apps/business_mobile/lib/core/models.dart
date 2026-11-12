enum OrderStage { fresh, accepted, preparing, ready, completed, cancelled }

enum LoadState { loading, data, empty, error }

enum DemoScenario { populated, empty, error }

class Reservation {
  const Reservation(
    this.id,
    this.guest,
    this.date,
    this.time,
    this.party, {
    this.confirmed = true,
    this.status = 'confirmed',
  });
  final String id;
  final String guest;
  final DateTime date;
  final String time;
  final int party;
  final bool confirmed;
  final String status;
}

class MerchantOrder {
  const MerchantOrder(
    this.id,
    this.title,
    this.guest,
    this.amount,
    this.stage,
    this.minutesAgo,
  {
    this.currency = 'NGN',
    this.status = 'placed',
  });
  final String id;
  final String title;
  final String guest;
  final int amount;
  final OrderStage stage;
  final int minutesAgo;
  final String currency;
  final String status;
  MerchantOrder withStage(OrderStage value) =>
      MerchantOrder(
        id,
        title,
        guest,
        amount,
        value,
        minutesAgo,
        currency: currency,
        status: switch (value) {
          OrderStage.fresh => 'placed',
          OrderStage.accepted => 'accepted',
          OrderStage.preparing => 'preparing',
          OrderStage.ready => 'ready',
          OrderStage.completed => 'fulfilled',
          OrderStage.cancelled => 'cancelled',
        },
      );
}

class MenuItem {
  const MenuItem(
    this.id,
    this.name,
    this.category,
    this.amount, {
    this.available = true,
    this.imageAsset,
    this.kind = 'product',
    this.description,
    this.currency = 'NGN',
    this.active = true,
  });
  final String id;
  final String name;
  final String category;
  final int amount;
  final bool available;
  final String? imageAsset;
  final String kind;
  final String? description;
  final String currency;
  final bool active;
  MenuItem withAvailability(bool value) => MenuItem(
    id,
    name,
    category,
    amount,
    available: value,
    imageAsset: imageAsset,
    kind: kind,
    description: description,
    currency: currency,
    active: value || active,
  );
}

class BusinessCapability {
  const BusinessCapability(
    this.id,
    this.name,
    this.description,
    this.enabled,
    this.metricLabel,
    this.metricValue,
    this.amountLabel,
    this.amount,
  );
  final String id;
  final String name;
  final String description;
  final bool enabled;
  final String metricLabel;
  final String metricValue;
  final String amountLabel;
  final int amount;
  BusinessCapability withEnabled(bool value) => BusinessCapability(
    id,
    name,
    description,
    value,
    metricLabel,
    metricValue,
    amountLabel,
    amount,
  );
}

class BusinessSnapshot {
  const BusinessSnapshot({
    required this.reservations,
    required this.orders,
    required this.menu,
    required this.services,
  });
  final List<Reservation> reservations;
  final List<MerchantOrder> orders;
  final List<MenuItem> menu;
  final List<BusinessCapability> services;
  static const empty = BusinessSnapshot(
    reservations: [],
    orders: [],
    menu: [],
    services: [],
  );
}

String money(int minorUnits, {String currency = 'NGN'}) {
  final digits = (minorUnits.abs() ~/ 100).toString();
  final whole = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  final cents = minorUnits.abs() % 100;
  final symbol = currency == 'NGN' ? '₦' : '$currency ';
  return '${minorUnits < 0 ? '-' : ''}$symbol$whole${cents == 0 ? '' : '.${cents.toString().padLeft(2, '0')}'}';
}

int? parsePrice(String value) {
  final text = value.trim();
  if (!RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(text)) return null;
  final parts = text.split('.');
  final amount =
      int.parse(parts.first) * 100 +
      (parts.length == 2 ? int.parse(parts[1].padRight(2, '0')) : 0);
  return amount > 0 ? amount : null;
}

String stageLabel(OrderStage stage) => switch (stage) {
  OrderStage.fresh => 'New',
  OrderStage.accepted => 'Accepted',
  OrderStage.preparing => 'Preparing',
  OrderStage.ready => 'Ready',
  OrderStage.completed => 'Completed',
  OrderStage.cancelled => 'Cancelled',
};

bool sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;
