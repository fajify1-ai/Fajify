import 'package:flutter/material.dart';

import '../../../core/theme/faji_colors.dart';
import '../data/legal_document.dart';
import '../data/privacy_policy.dart';
import '../data/terms_of_service.dart';

class TermsOfServiceScreen extends StatelessWidget {
  const TermsOfServiceScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const LegalDocumentScreen(document: termsOfService);
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const LegalDocumentScreen(document: privacyPolicy);
}

/// Offline-readable legal content. No authentication, network call, fixed text
/// height, or automatic publication date is required to display a document.
class LegalDocumentScreen extends StatelessWidget {
  const LegalDocumentScreen({super.key, required this.document});
  final LegalDocument document;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: FajiColors.background,
    appBar: AppBar(
      backgroundColor: FajiColors.surface,
      foregroundColor: FajiColors.textPrimary,
      title: Text(document.title, maxLines: 1, overflow: TextOverflow.ellipsis),
    ),
    body: SafeArea(
      top: false,
      child: Scrollbar(
        child: SingleChildScrollView(
          key: ValueKey('${document.id}-scroll'),
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: SelectionArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'FAJI LEGAL',
                      style: TextStyle(
                        color: FajiColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Semantics(
                      header: true,
                      child: Text(
                        document.title,
                        style: const TextStyle(
                          color: FajiColors.textPrimary,
                          fontSize: 28,
                          height: 1.2,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      document.subtitle,
                      style: const TextStyle(
                        color: FajiColors.textSecondary,
                        fontSize: 16,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (document.isDraft)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: FajiColors.decorativeRed,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: FajiColors.border),
                        ),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'DRAFT — AWAITING APPROVAL',
                              style: TextStyle(
                                color: FajiColors.textPrimary,
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                height: 1.5,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'For business and legal review. Not yet effective or approved for public release. Marked decisions and missing operator details must be resolved.',
                              style: TextStyle(
                                color: FajiColors.textPrimary,
                                fontSize: 15,
                                height: 1.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      'Version: ${document.version}',
                      style: const TextStyle(
                        color: FajiColors.textSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    Text(
                      'Last updated: ${document.lastUpdated}',
                      key: ValueKey('${document.id}-last-updated'),
                      style: const TextStyle(
                        color: FajiColors.textSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Divider(color: FajiColors.border),
                    for (var i = 0; i < document.sections.length; i++) ...[
                      const SizedBox(height: 24),
                      Semantics(
                        header: true,
                        child: Text(
                          '${i + 1}. ${document.sections[i].title}',
                          key: ValueKey('${document.id}-section-${i + 1}'),
                          style: const TextStyle(
                            color: FajiColors.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            height: 1.4,
                          ),
                        ),
                      ),
                      for (final paragraph in document.sections[i].paragraphs)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            paragraph,
                            style: const TextStyle(
                              color: FajiColors.textPrimary,
                              fontSize: 16,
                              height: 1.65,
                            ),
                          ),
                        ),
                      if (document.sections[i].reviewNote != null)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(top: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: FajiColors.surface,
                            border: Border.all(color: FajiColors.border),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            'Review required: ${document.sections[i].reviewNote}',
                            style: const TextStyle(
                              color: FajiColors.textPrimary,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                        ),
                    ],
                    const SizedBox(height: 32),
                    const Divider(color: FajiColors.border),
                    const SizedBox(height: 16),
                    const Text(
                      'End of document',
                      style: TextStyle(
                        color: FajiColors.textSecondary,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
