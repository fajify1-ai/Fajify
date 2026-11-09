import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../legal/presentation/legal_routes.dart';
import '../../../legal/data/terms_of_service.dart';
import '../../../legal/data/privacy_policy.dart';

/// This required checkbox accepts Terms and acknowledges a notice. It is not
/// marketing consent and never changes simply because a document was opened.
class RegistrationLegalAcknowledgement extends StatelessWidget {
  const RegistrationLegalAcknowledgement({
    super.key,
    required this.value,
    required this.onChanged,
  });
  final bool value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: FajiColors.primary,
            semanticLabel:
                'Accept Terms of Service and acknowledge the Privacy Policy',
            side: const BorderSide(color: FajiColors.border),
          ),
          Expanded(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'I accept the ',
                  style: TextStyle(
                    color: FajiColors.textPrimary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                _LegalLink(label: 'Terms of Service', route: LegalRoutes.terms),
                const Text(
                  ' and acknowledge the ',
                  style: TextStyle(
                    color: FajiColors.textPrimary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                _LegalLink(label: 'Privacy Policy', route: LegalRoutes.privacy),
                const Text(
                  '.',
                  style: TextStyle(color: FajiColors.textPrimary, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
      const Padding(
        padding: EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Text(
          'Acknowledgement is not consent to optional marketing or other optional processing.',
          style: TextStyle(
            color: FajiColors.textSecondary,
            fontSize: 12,
            height: 1.5,
          ),
        ),
      ),
      if (termsOfService.isDraft || privacyPolicy.isDraft)
        const Padding(
          padding: EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Text(
            'Legal drafts — awaiting business and legal approval.',
            style: TextStyle(
              color: FajiColors.textSecondary,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ),
    ],
  );
}

class _LegalLink extends StatelessWidget {
  const _LegalLink({required this.label, required this.route});
  final String label;
  final String route;
  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: () => Navigator.of(context).pushNamed(route),
    style: TextButton.styleFrom(
      // A darker brand red keeps small link text readable on the white sheet.
      foregroundColor: const Color(0xFFA82420),
      minimumSize: const Size(48, 48),
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 10),
      textStyle: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        decoration: TextDecoration.underline,
      ),
    ),
    child: Text(label),
  );
}
