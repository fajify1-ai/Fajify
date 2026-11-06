import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/data/platform_secure_session_store.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  late PlatformSecureSessionStore store;
  final values = <String, String>{'unrelated': 'keep'};
  final calls = <String>[];

  setUp(() {
    store = PlatformSecureSessionStore();
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    calls.clear();
    values
      ..clear()
      ..['unrelated'] = 'keep';
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call.method);
          final args = call.arguments as Map;
          final key = args['key'] as String;
          switch (call.method) {
            case 'read':
              return values[key];
            case 'write':
              values[key] = args['value'] as String;
              return null;
            case 'delete':
              values.remove(key);
              return null;
            default:
              throw StateError('Unexpected storage operation');
          }
        });
  });
  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('round trip and logout clear only the customer session', () async {
    expect(await store.read(), isNull);
    await store.write('test-only-opaque-sdk-state');
    expect(await store.read(), 'test-only-opaque-sdk-state');
    await store.clear();
    expect(await store.read(), isNull);
    expect(values, {'unrelated': 'keep'});
    expect(calls, isNot(contains('deleteAll')));
  });

  test('native failure propagates with no plaintext fallback', () async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (_) async {
          throw PlatformException(code: 'storage_locked');
        });
    await expectLater(store.read(), throwsA(isA<PlatformException>()));
    await expectLater(
      store.write('test-only'),
      throwsA(isA<PlatformException>()),
    );
    await expectLater(store.clear(), throwsA(isA<PlatformException>()));
  });

  test('unsupported platform never invokes storage', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    await expectLater(store.read(), throwsA(isA<AuthFailure>()));
    expect(calls, isEmpty);
  });
  test(
    'logout clear waits for an in-flight write and removes its result',
    () async {
      final entered = Completer<void>();
      final release = Completer<void>();
      String? session;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call.method);
            if (call.method == 'write') {
              entered.complete();
              await release.future;
              session = (call.arguments as Map)['value'] as String;
            } else if (call.method == 'delete') {
              session = null;
            } else if (call.method == 'read') {
              return session;
            }
            return null;
          });
      final write = store.write('test-only');
      await entered.future;
      final clear = store.clear();
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['write']);
      release.complete();
      await Future.wait([write, clear]);
      expect(await store.read(), isNull);
      expect(calls, ['write', 'delete', 'read']);
    },
  );

  test('a failed write does not prevent a subsequent logout clear', () async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call.method);
          if (call.method == 'write') throw PlatformException(code: 'locked');
          return null;
        });
    await expectLater(
      store.write('test-only'),
      throwsA(isA<PlatformException>()),
    );
    await store.clear();
    expect(calls, ['write', 'delete']);
  });
}
