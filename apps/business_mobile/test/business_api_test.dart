import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/core/business_api.dart';
import 'package:faji_business/core/business_controller.dart';
import 'package:faji_business/core/config.dart';
import 'package:faji_business/core/services.dart';
import 'package:faji_business/features/operations.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test(
    'API requests carry the current bearer token and exact versioned path',
    () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('[]', 200);
      });
      final api = BusinessApiClient(
        const BusinessConfig(apiBaseUrl: 'https://api.example.test'),
        accessToken: () async => 'test-access-token',
        client: client,
      );

      await api.get(['businesses', 'business id', 'branches']);

      expect(captured.url.path, '/api/v1/businesses/business%20id/branches');
      expect(captured.headers['Authorization'], 'Bearer test-access-token');
      expect(captured.headers['Accept'], 'application/json');
      client.close();
    },
  );

  test('API failures preserve server status and message', () async {
    final client = MockClient(
      (_) async => http.Response(
        jsonEncode({'message': 'Branch access was revoked.'}),
        403,
        headers: {'content-type': 'application/json'},
      ),
    );
    final api = BusinessApiClient(
      const BusinessConfig(apiBaseUrl: 'https://api.example.test'),
      accessToken: () async => 'test-access-token',
      client: client,
    );

    await expectLater(
      api.get(['businesses', 'business-id', 'branches']),
      throwsA(
        isA<BusinessApiFailure>()
            .having((failure) => failure.statusCode, 'status', 403)
            .having(
              (failure) => failure.message,
              'message',
              'Branch access was revoked.',
            ),
      ),
    );
    client.close();
  });

  test(
    'repository loads typed branch operations from the API contract',
    () async {
      final client = MockClient((request) async {
        final path = request.url.path;
        if (path.endsWith('/branches')) {
          return http.Response(
            jsonEncode([
              {
                'id': 'branch-1',
                'business_id': 'business-1',
                'name': 'Lagos',
                'active': true,
                'timezone': 'Africa/Lagos',
              },
            ]),
            200,
          );
        }
        if (path.endsWith('/catalogue') ||
            path.endsWith('/availability') ||
            path.endsWith('/reservations') ||
            path.endsWith('/orders')) {
          return http.Response('[]', 200);
        }
        if (path.endsWith('/overview')) {
          return http.Response(
            jsonEncode({
              'branches': 1,
              'catalogue_items': 0,
              'reservations': 0,
              'orders': 0,
              'fulfilled_order_total_minor': '0',
            }),
            200,
          );
        }
        return http.Response('Not found', 404);
      });
      final repository = BusinessApiRepository(
        BusinessApiClient(
          const BusinessConfig(apiBaseUrl: 'https://api.example.test'),
          accessToken: () async => 'test-access-token',
          client: client,
        ),
      );

      final branches = await repository.loadBranches('business-1');
      final snapshot = await repository.load('business-1');

      expect(branches.single.name, 'Lagos');
      expect(repository.selectedBranchId, 'branch-1');
      expect(snapshot.orders, isEmpty);
      expect(repository.lastOverview?.branches, 1);
      client.close();
    },
  );

  test('identity opens only approved business membership scopes', () {
    final identity = BusinessIdentity.fromAuthResponse({
      'subject': 'existing-subject',
      'roles': ['merchant'],
      'memberships': [
        {
          'resourceType': 'business',
          'resourceId': 'approved-business',
          'role': 'manager',
          'status': 'approved',
        },
        {
          'resourceType': 'business',
          'resourceId': 'pending-business',
          'role': 'owner',
          'status': 'pending',
        },
        {
          'resourceType': 'branch',
          'resourceId': 'branch-1',
          'role': 'staff',
          'status': 'approved',
        },
      ],
    });

    expect(identity.businessMemberships, {'approved-business'});
    expect(identity.membershipRoles, {'approved-business': 'manager'});
  });

  testWidgets(
    'branch edits submit only fields supported by the PATCH contract',
    (tester) async {
      final branchJson = {
        'id': 'branch-1',
        'business_id': 'business-1',
        'name': 'Lagos',
        'active': true,
        'timezone': 'Africa/Lagos',
        'address': 'Main Street',
        'contact_email': 'owner@example.test',
      };
      Map<String, dynamic>? updateBody;
      final client = MockClient((request) async {
        final path = request.url.path;
        if (request.method == 'PATCH' && path.endsWith('/branches/branch-1')) {
          updateBody = jsonDecode(request.body) as Map<String, dynamic>;
          return http.Response(
            jsonEncode({...branchJson, 'name': updateBody!['name']}),
            200,
          );
        }
        if (path.endsWith('/branches')) {
          return http.Response(jsonEncode([branchJson]), 200);
        }
        if (path.endsWith('/hours') ||
            path.endsWith('/catalogue') ||
            path.endsWith('/availability') ||
            path.endsWith('/reservations') ||
            path.endsWith('/orders')) {
          return http.Response('[]', 200);
        }
        if (path.endsWith('/overview')) {
          return http.Response(
            jsonEncode({
              'branches': 1,
              'catalogue_items': 0,
              'reservations': 0,
              'orders': 0,
              'fulfilled_order_total_minor': '0',
            }),
            200,
          );
        }
        return http.Response('Not found', 404);
      });
      final repository = BusinessApiRepository(
        BusinessApiClient(
          const BusinessConfig(apiBaseUrl: 'https://api.example.test'),
          accessToken: () async => 'test-access-token',
          client: client,
        ),
      )..selectBranch('branch-1');
      final controller = BusinessController(repository: repository)
        ..session = SessionStatus.merchant
        ..businessId = 'business-1'
        ..selectedBranchId = 'branch-1'
        ..branches = [
          MerchantBranch(
            id: 'branch-1',
            businessId: 'business-1',
            name: 'Lagos',
            active: true,
            timezone: 'Africa/Lagos',
            address: 'Main Street',
            contactEmail: 'owner@example.test',
          ),
        ]
        ..account = const BusinessIdentity(
          subject: 'owner',
          roles: {'merchant'},
          businessMemberships: {'business-1'},
          membershipRoles: {'business-1': 'owner'},
        );

      await tester.pumpWidget(
        MaterialApp(home: OperationsPage(controller: controller)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Edit branch settings'));
      await tester.pumpAndSettle();

      expect(find.text('Timezone'), findsNothing);
      expect(find.text('Address (optional)'), findsNothing);
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Branch name'),
        'Updated Lagos',
      );
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      expect(updateBody, {
        'name': 'Updated Lagos',
        'contactEmail': 'owner@example.test',
        'active': true,
      });
      controller.dispose();
      client.close();
    },
  );
}
