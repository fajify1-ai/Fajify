import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/core/business_controller.dart';
import 'package:faji_business/core/config.dart';
import 'package:faji_business/core/models.dart';
import 'package:faji_business/core/services.dart';
import 'package:faji_business/app/business_app.dart';

void main() {
  late MockBusinessRepository repository;
  late BusinessController c;
  setUp(() {
    repository = MockBusinessRepository(delay: Duration.zero);
    c = BusinessController(repository: repository);
  });
  tearDown(() => c.dispose());

  test('populated merchant fixtures and summaries agree', () async {
    await c.enterDemo();
    expect(c.state, LoadState.data);
    expect(c.data.services.where((s) => s.enabled).length, 4);
    expect(c.data.services.length, 8);
    expect(c.data.menu.length, 6);
    expect(
      c.data.orders.where((o) => o.stage != OrderStage.completed).length,
      3,
    );
    expect(
      c.data.reservations
          .where((r) => sameDay(r.date, DateTime(2026, 8, 30)))
          .fold(0, (int n, r) => n + r.party),
      6,
    );
  });
  test(
    'orders advance through the local lifecycle and stop at completed',
    () async {
      await c.enterDemo();
      for (final expected in [
        OrderStage.preparing,
        OrderStage.ready,
        OrderStage.completed,
      ]) {
        expect(await c.advance('order-1'), isTrue);
        expect(c.data.orders.first.stage, expected);
      }
      expect(await c.advance('order-1'), isFalse);
      expect(c.data.orders.first.stage, OrderStage.completed);
    },
  );
  test('write failure does not change fixtures and can be retried', () async {
    await c.enterDemo();
    repository.failNextWrite = true;
    expect(await c.advance('order-1'), isFalse);
    expect(c.data.orders.first.stage, OrderStage.fresh);
    expect(c.busy, isFalse);
    expect(await c.advance('order-1'), isTrue);
  });
  test('duplicate mutation is rejected while first is pending', () async {
    await c.enterDemo();
    final first = c.advance('order-1');
    expect(await c.advance('order-1'), isFalse);
    expect(await first, isTrue);
    expect(c.data.orders.first.stage, OrderStage.preparing);
  });
  test('menu edits preserve count and local additions increase it', () async {
    await c.enterDemo();
    expect(await c.saveMenu(c.data.menu.first.withAvailability(false)), isTrue);
    expect(c.data.menu.length, 6);
    expect(c.data.menu.firstWhere((m) => m.id == 'menu-1').available, isFalse);
    expect(
      await c.saveMenu(MenuItem(c.nextMenuId(), 'Soup', 'Starters', 250050)),
      isTrue,
    );
    expect(c.data.menu.length, 7);
    expect(c.data.menu.last.amount, 250050);
  });
  test(
    'service count changes from actual states and reset restores it',
    () async {
      await c.enterDemo();
      await c.setService('tickets', true);
      expect(c.data.services.where((s) => s.enabled).length, 5);
      await c.reset();
      expect(c.data.services.where((s) => s.enabled).length, 4);
    },
  );
  test('empty and error reads recover to populated fixtures', () async {
    await c.enterDemo();
    await c.scenario(DemoScenario.empty);
    expect(c.state, LoadState.empty);
    expect(c.data.orders, isEmpty);
    await c.scenario(DemoScenario.error);
    expect(c.state, LoadState.error);
    await c.scenario(DemoScenario.populated);
    expect(c.state, LoadState.data);
  });
  test('merchant contexts keep local changes separate', () async {
    await c.enterDemo();
    await c.advance('order-1');
    await c.selectBusiness('demo-island');
    expect(c.data.orders.first.stage, OrderStage.fresh);
    expect(c.data.orders.first.guest, startsWith('Island'));
    await c.selectBusiness('demo-lagos');
    expect(c.data.orders.first.stage, OrderStage.preparing);
  });
  test(
    'logout clears demo data and prevents an in-flight mutation resurfacing',
    () async {
      await c.enterDemo();
      final pending = c.advance('order-1');
      await c.logout();
      expect(await pending, isFalse);
      expect(c.session, SessionStatus.signedOut);
      expect(c.data.orders, isEmpty);
      await c.enterDemo();
      expect(c.data.orders.first.stage, OrderStage.fresh);
    },
  );
  test('wrong role cannot load or mutate merchant data', () async {
    await c.enterDemo(merchant: false);
    expect(c.session, SessionStatus.denied);
    expect(c.data.orders, isEmpty);
    expect(await c.advance('order-1'), isFalse);
  });
  test('scan contexts reject wrong types and repeated codes', () async {
    await c.enterDemo();
    expect(c.scan(order: false, code: 'order-1'), startsWith('Invalid'));
    expect(c.scan(order: true, code: 'booking-1'), startsWith('Invalid'));
    expect(c.scan(order: false, code: 'booking-1'), startsWith('Demo guest'));
    expect(
      c.scan(order: false, code: 'booking-1'),
      contains('already been used'),
    );
    expect(c.scan(order: true, code: 'order-1'), startsWith('Demo recipient'));
    expect(c.data.orders.first.stage, OrderStage.fresh);
  });
  test('editing an existing menu item preserves list order', () async {
    await c.enterDemo();
    final ids = c.data.menu.map((m) => m.id).toList();
    await c.saveMenu(c.data.menu.first.withAvailability(false));
    expect(c.data.menu.map((m) => m.id).toList(), ids);
  });
  test(
    'empty scenario can create its first item without hidden fixtures',
    () async {
      await c.enterDemo();
      await c.scenario(DemoScenario.empty);
      expect(
        await c.saveMenu(MenuItem(c.nextMenuId(), 'Soup', 'Starters', 250000)),
        isTrue,
      );
      expect(c.data.menu.length, 1);
      expect(c.data.menu.single.name, 'Soup');
      expect(c.data.orders, isEmpty);
      await c.scenario(DemoScenario.populated);
      expect(c.data.menu.length, 6);
    },
  );
  test('price parsing uses exact minor units and rejects invalid inputs', () {
    expect(parsePrice('7000.01'), 700001);
    for (final value in ['0', '-2', 'NaN', '1.001', '1e6', '7,000', '']) {
      expect(parsePrice(value), isNull, reason: value);
    }
    expect(money(700001), '₦7,000.01');
  });
  test('saved navigation only allows local merchant destinations', () {
    expect(safeDestination('/orders/order-1'), '/orders/order-1');
    for (final value in [
      'https://example.com',
      '//example.com',
      '/login',
      '/does-not-exist',
      '/\\example.com',
    ]) {
      expect(safeDestination(value), '/dashboard');
    }
  });
  test('live and non-development configurations fail closed', () {
    expect(const BusinessConfig().problem, isNull);
    expect(const BusinessConfig(useMocks: false).problem, isNotNull);
    expect(const BusinessConfig(environment: 'production').problem, isNotNull);
  });
  test('sign-in failure leaves session signed out', () async {
    final controller = BusinessController(
      repository: repository,
      identity: _FailingIdentity(),
    );
    await controller.enterDemo();
    expect(controller.session, SessionStatus.signedOut);
    expect(controller.error, contains('failed'));
    expect(controller.signingIn, isFalse);
    controller.dispose();
  });
  test('late sign-in completion cannot reopen a logged-out session', () async {
    final identity = _DelayedIdentity();
    final controller = BusinessController(
      repository: repository,
      identity: identity,
    );
    final pending = controller.enterDemo();
    await controller.logout();
    identity.pending.complete();
    await pending;
    expect(controller.session, SessionStatus.signedOut);
    controller.dispose();
  });
}

class _FailingIdentity implements IdentityService {
  @override
  Future<void> signIn() async => throw const DemoFailure();
  @override
  Future<void> signOut() async {}
}

class _DelayedIdentity implements IdentityService {
  final pending = Completer<void>();
  @override
  Future<void> signIn() => pending.future;
  @override
  Future<void> signOut() async {}
}
