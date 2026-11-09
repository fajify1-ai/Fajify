/// Reviewed content and presentation are deliberately separate. Never populate
/// approvedOn with a build date: it must identify an actually approved revision.
class LegalDocument {
  const LegalDocument({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.version,
    required this.sections,
    this.approvedOn,
  });
  final String id;
  final String title;
  final String subtitle;
  final String version;
  final String? approvedOn;
  final List<LegalSection> sections;
  bool get isDraft => approvedOn == null;
  String get lastUpdated => approvedOn ?? 'Pending approval';
}

class LegalSection {
  const LegalSection(this.title, this.paragraphs, {this.reviewNote});
  final String title;
  final List<String> paragraphs;
  final String? reviewNote;
}
