import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/core/keycloak_identity_service.dart';

void main() {
  test('only approved, well-formed business memberships become scopes', () {
    const approved = '11111111-1111-4111-8111-111111111111';
    const pending = '22222222-2222-4222-8222-222222222222';
    expect(
      approvedBusinessIds([
        {
          'resourceType': 'business',
          'resourceId': approved,
          'role': 'owner',
          'status': 'approved',
        },
        {
          'resourceType': 'business',
          'resourceId': pending,
          'role': 'manager',
          'status': 'pending',
        },
        {
          'resourceType': 'branch',
          'resourceId': pending,
          'role': 'staff',
          'status': 'approved',
        },
        {
          'resourceType': 'business',
          'resourceId': 'demo-lagos',
          'role': 'owner',
          'status': 'approved',
        },
        {
          'resourceType': 'business',
          'resourceId': pending,
          'role': 'driver',
          'status': 'approved',
        },
        null,
      ]),
      {approved},
    );
  });

  test('missing membership data grants no business scope', () {
    expect(approvedBusinessIds(null), isEmpty);
    expect(approvedBusinessIds({'resourceId': 'business'}), isEmpty);
  });
}
