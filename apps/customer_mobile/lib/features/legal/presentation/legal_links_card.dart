import 'package:flutter/material.dart';

import '../../../core/theme/faji_colors.dart';
import 'legal_routes.dart';
import '../data/terms_of_service.dart';
import '../data/privacy_policy.dart';

class LegalLinksCard extends StatelessWidget {
  const LegalLinksCard({super.key});
  @override
  Widget build(BuildContext context) => Material(
    color: FajiColors.surface,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: const BorderSide(color: FajiColors.border),
    ),
    child: Column(
      children: [
        ListTile(
          leading: const Icon(
            Icons.description_outlined,
            color: FajiColors.primary,
          ),
          title: const Text('Terms of Service'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).pushNamed(LegalRoutes.terms),
        ),
        const Divider(
          height: 1,
          color: FajiColors.border,
          indent: 16,
          endIndent: 16,
        ),
        ListTile(
          leading: const Icon(
            Icons.privacy_tip_outlined,
            color: FajiColors.primary,
          ),
          title: const Text('Privacy Policy'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).pushNamed(LegalRoutes.privacy),
        ),
        if (termsOfService.isDraft || privacyPolicy.isDraft)
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Text(
              'Drafts awaiting business and legal approval.',
              style: TextStyle(
                color: FajiColors.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ),
      ],
    ),
  );
}
