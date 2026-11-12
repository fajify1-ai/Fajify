import 'package:flutter/material.dart';

import '../core/business_api.dart';
import '../core/business_controller.dart';
import '../shared/business_ui.dart';

class StaffPage extends StatefulWidget {
  const StaffPage({super.key, required this.controller});

  final BusinessController controller;

  @override
  State<StaffPage> createState() => _StaffPageState();
}

class _StaffPageState extends State<StaffPage> {
  List<MerchantStaffGrant> _grants = const [];
  bool _loading = true;
  bool _loadFailed = false;
  String? _businessId;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_controllerChanged);
    _load();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_controllerChanged);
    super.dispose();
  }

  void _controllerChanged() {
    if (_businessId != widget.controller.businessId && !_loading) _load();
  }

  Future<void> _load() async {
    _businessId = widget.controller.businessId;
    setState(() => _loading = true);
    try {
      final grants = await widget.controller.loadStaff();
      if (mounted && _businessId == widget.controller.businessId) {
        setState(() {
          _grants = grants;
          _loadFailed = false;
        });
      }
    } on Exception {
      _loadFailed = true;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final controller = widget.controller;
      final visibleGrants = _grants
          .where((grant) => grant.role != 'staff' || grant.resourceType == 'branch')
          .toList(growable: false);
      if (controller.isSample || !controller.isBusinessOwner) {
        return Scaffold(
          body: SafeArea(
            child: PageBody(
              title: 'Staff access',
              subtitle: 'Staff grants are available to business owners.',
              children: [
                _StaffNotice(
                  message: controller.isSample
                      ? 'Sample mode does not create identity or access grants.'
                      : 'Your approved membership does not have owner permissions.',
                ),
              ],
            ),
          ),
        );
      }
      return Scaffold(
        body: SafeArea(
          child: PageBody(
            title: 'Staff access',
            subtitle: 'Grant or revoke roles for existing identity subjects.',
            children: [
              if (controller.error != null)
                _StaffNotice(message: controller.error!),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Access grants',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Refresh staff',
                    onPressed: _loading ? null : _load,
                    icon: const Icon(Icons.refresh),
                  ),
                  FilledButton.icon(
                    onPressed: controller.busy ? null : _grant,
                    icon: const Icon(Icons.person_add_alt_1),
                    label: const Text('Grant access'),
                  ),
                ],
              ),
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_loadFailed)
                const _StaffNotice(
                  message: 'Staff grants could not be loaded. Retry after checking the error above.',
                )
              else if (visibleGrants.isEmpty)
                const _StaffNotice(
                  message: 'No staff grants were returned for this business.',
                )
              else
                for (final grant in visibleGrants)
                  Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        child: Icon(
                          grant.active
                              ? Icons.person_outline
                              : Icons.person_off_outlined,
                        ),
                      ),
                      title: Text(_shortSubject(grant.subject)),
                      subtitle: Text(
                        '${grant.role} · ${grant.resourceType}'
                        '${grant.resourceType == 'branch' ? ' · branch-specific' : ''}'
                        '${grant.active ? '' : ' · revoked'}',
                      ),
                      trailing: grant.active &&
                              (grant.role == 'manager' ||
                                  grant.resourceType == 'branch')
                          ? IconButton(
                              tooltip: 'Revoke grant',
                              onPressed: controller.busy
                                  ? null
                                  : () => _revoke(grant),
                              icon: const Icon(Icons.remove_circle_outline),
                            )
                          : null,
                    ),
                  ),
              const _StaffNotice(
                message:
                    'A grant targets an existing identity subject. The server validates '
                    'the target and remains authoritative for all protected actions.',
              ),
            ],
          ),
        ),
      );
    },
  );

  Future<void> _grant() async {
    final value = await showDialog<_GrantInput>(
      context: context,
      builder: (context) => _GrantDialog(branches: widget.controller.branches),
    );
    if (value == null || !mounted) return;
    final saved = await widget.controller.grantStaff(
      subject: value.subject,
      role: value.role,
      branchId: value.branchId,
    );
    if (!mounted) return;
    if (saved) {
      await _load();
    } else {
      _showError();
    }
  }

  Future<void> _revoke(MerchantStaffGrant grant) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revoke staff access?'),
        content: Text(
          'Revoke the ${grant.role} grant for ${_shortSubject(grant.subject)}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep access'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final saved = await widget.controller.revokeStaff(
      subject: grant.subject,
      role: grant.role,
      branchId: grant.resourceType == 'branch' ? grant.resourceId : null,
    );
    if (!mounted) return;
    if (saved) {
      await _load();
    } else {
      _showError();
    }
  }

  void _showError() {
    final message = widget.controller.error;
    if (message == null || message.isEmpty) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _GrantInput {
  const _GrantInput(this.subject, this.role, this.branchId);

  final String subject;
  final String role;
  final String? branchId;
}

class _GrantDialog extends StatefulWidget {
  const _GrantDialog({required this.branches});

  final List<MerchantBranch> branches;

  @override
  State<_GrantDialog> createState() => _GrantDialogState();
}

class _GrantDialogState extends State<_GrantDialog> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  String _role = 'staff';
  String? _branchId;

  List<MerchantBranch> get _activeBranches =>
      widget.branches.where((branch) => branch.active).toList(growable: false);

  @override
  void dispose() {
    _subject.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Grant staff access'),
    content: Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextFormField(
            controller: _subject,
            decoration: const InputDecoration(
              labelText: 'Existing identity subject',
            ),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Enter the existing subject identifier.'
                : null,
          ),
          DropdownButtonFormField<String>(
            initialValue: _role,
            decoration: const InputDecoration(labelText: 'Role'),
            items: const [
              DropdownMenuItem(value: 'manager', child: Text('Manager')),
              DropdownMenuItem(value: 'staff', child: Text('Staff')),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() {
                  _role = value;
                  _branchId = value == 'manager'
                      ? null
                      : _activeBranches.firstOrNull?.id;
                });
              }
            },
          ),
          DropdownButtonFormField<String?>(
            key: ValueKey(_role),
            initialValue: _role == 'manager' ? null : _branchId,
            decoration: const InputDecoration(labelText: 'Scope'),
            items: [
              if (_role == 'manager')
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('Business-wide'),
                ),
              if (_role == 'staff')
                for (final branch in _activeBranches)
                  DropdownMenuItem<String?>(
                    value: branch.id,
                    child: Text(branch.name, overflow: TextOverflow.ellipsis),
                  ),
            ],
            validator: (value) => _role == 'staff' && value == null
                ? 'Select an active branch for staff access.'
                : null,
            onChanged: (value) => setState(() => _branchId = value),
          ),
          if (_role == 'staff' && _activeBranches.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Create an active branch before granting staff access.'),
            ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () {
          if (!_formKey.currentState!.validate()) return;
          Navigator.pop(
            context,
            _GrantInput(_subject.text.trim(), _role, _branchId),
          );
        },
        child: const Text('Grant'),
      ),
    ],
  );
}

class _StaffNotice extends StatelessWidget {
  const _StaffNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Panel(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.info_outline),
        const SizedBox(width: 12),
        Expanded(child: Text(message)),
      ],
    ),
  );
}

String _shortSubject(String subject) => subject.length <= 12
    ? subject
    : '${subject.substring(0, 6)}…${subject.substring(subject.length - 4)}';
