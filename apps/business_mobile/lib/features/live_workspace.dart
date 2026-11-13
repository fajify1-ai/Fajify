import 'package:flutter/material.dart';

import '../core/business_controller.dart';
import '../core/keycloak_identity_service.dart';
import '../core/models.dart';

class LiveWorkspace extends StatefulWidget {
  const LiveWorkspace({super.key, required this.controller});

  final BusinessController controller;

  @override
  State<LiveWorkspace> createState() => _LiveWorkspaceState();
}

class _LiveWorkspaceState extends State<LiveWorkspace> {
  static const sections = ['orders', 'reservations', 'catalogue', 'availability'];
  String? _branch;
  String _section = sections.first;
  late Future<({String name, List<Map<String, dynamic>> branches, List<Map<String, dynamic>> records})> _data;
  bool _saving = false;

  KeycloakIdentityService get _api =>
      widget.controller.identity as KeycloakIdentityService;
  String get _business => Uri.encodeComponent(widget.controller.businessId);
  Set<String> get _roles =>
      widget.controller.account?.membershipRoles[widget.controller.businessId] ?? {};
  bool get _owner => _roles.contains('owner');
  bool get _manage => _owner || _roles.contains('manager');
  String get _base => 'businesses/$_business';

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<List<Map<String, dynamic>>> _list(String path) async =>
      (await _api.merchantRequest('GET', path) as List).cast<Map<String, dynamic>>();

  Future<({String name, List<Map<String, dynamic>> branches, List<Map<String, dynamic>> records})> _load() async {
    final base = _base;
    final section = _section;
    final workspace = await _api.merchantRequest(
      'GET', 'business/onboarding/$_business/workspace',
    ) as Map<String, dynamic>;
    final branches = (await _list('$base/branches'))
        .where((branch) => branch['active'] == true).toList();
    final branch = branches.any((row) => row['id'] == _branch)
        ? _branch
        : branches.firstOrNull?['id'] as String?;
    final records = section == 'staff' ? await _list('$base/staff') : branch == null
        ? <Map<String, dynamic>>[]
        : await _list('$base/branches/${Uri.encodeComponent(branch)}/$section');
    return (name: workspace['display_name'] as String, branches: branches, records: records);
  }

  void _refresh() => setState(() => _data = _load());

  String _label(Object? value) => (value ?? '').toString().replaceAll('_', ' ');

  String? _next(Object? status) => switch ((_section, status)) {
    ('orders', 'placed') => 'accepted',
    ('orders', 'accepted') => 'preparing',
    ('orders', 'preparing') => 'ready',
    ('orders', 'ready') => 'fulfilled',
    ('reservations', 'confirmed') => 'checked_in',
    ('reservations', 'checked_in') => 'completed',
    _ => null,
  };

  Future<void> _advance(String branch, String id, String status) async {
    setState(() => _saving = true);
    try {
      await _api.merchantRequest(
        'PATCH',
        '$_base/branches/${Uri.encodeComponent(branch)}/$_section/${Uri.encodeComponent(id)}/status',
        {'status': status},
      );
      if (mounted) _refresh();
    } on Exception catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error is IdentityFailure ? error.message : 'The update failed.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _edit({
    required String title,
    required String method,
    required String path,
    Map<String, String> fields = const {},
    Map<String, Object> values = const {},
    Set<String> integers = const {},
    Map<String, List<String>> options = const {},
  }) async {
    final form = GlobalKey<FormState>();
    final input = <String, String>{};
    final payload = await showDialog<Map<String, Object>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Form(
          key: form,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final field in fields.entries)
                  if (options.containsKey(field.key))
                    DropdownButtonFormField<String>(
                      decoration: InputDecoration(labelText: field.value),
                      items: [
                        for (final value in options[field.key]!)
                          DropdownMenuItem(value: value, child: Text(value)),
                      ],
                      onChanged: (value) => input[field.key] = value ?? '',
                      validator: (value) => value == null ? 'Select an option.' : null,
                    )
                  else
                    TextFormField(
                      decoration: InputDecoration(labelText: field.value),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty) return 'This field is required.';
                        if (integers.contains(field.key) &&
                            (int.tryParse(text) ?? -1) < 0) {
                          return 'Enter a valid whole number.';
                        }
                        return null;
                      },
                      onSaved: (value) => input[field.key] = value!.trim(),
                    ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
          FilledButton(
            onPressed: () {
              if (!form.currentState!.validate()) return;
              form.currentState!.save();
              Navigator.pop(context, <String, Object>{
                ...values,
                for (final entry in input.entries)
                  entry.key: integers.contains(entry.key) ? int.parse(entry.value) : entry.value,
              });
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (payload == null || !mounted) return;
    setState(() => _saving = true);
    try {
      await _api.merchantRequest(method, path, payload);
      if (mounted) _refresh();
    } on Exception catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error is IdentityFailure ? error.message : 'The update failed.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business workspace'),
        actions: [
          IconButton(tooltip: 'Refresh', onPressed: _saving ? null : _refresh, icon: const Icon(Icons.refresh)),
          IconButton(tooltip: 'Sign out', onPressed: _saving ? null : widget.controller.logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: FutureBuilder(
        future: _data,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Could not load the workspace.'),
                TextButton(onPressed: _refresh, child: const Text('Try again')),
              ],
            ));
          }
          final data = snapshot.data!;
          final branch = data.branches.any((row) => row['id'] == _branch)
              ? _branch
              : data.branches.firstOrNull?['id'] as String?;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(data.name, style: Theme.of(context).textTheme.headlineSmall),
              if (_manage)
                TextButton(
                  onPressed: _saving ? null : () => _edit(
                    title: 'Create branch',
                    method: 'POST',
                    path: '$_base/branches',
                    fields: const {'name': 'Branch name', 'address': 'Address'},
                  ),
                  child: const Text('Create branch'),
                ),
              if (branch == null)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('No active branches are assigned to this account.'),
                )
              else ...[
                DropdownButton<String>(
                  isExpanded: true,
                  value: branch,
                  items: [
                    for (final row in data.branches)
                      DropdownMenuItem(value: row['id'] as String, child: Text(row['name'] as String)),
                  ],
                  onChanged: _saving ? null : (value) {
                    _branch = value;
                    _refresh();
                  },
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final section in [...sections, if (_manage) 'staff'])
                      ChoiceChip(
                        label: Text('${section[0].toUpperCase()}${section.substring(1)}'),
                        selected: section == _section,
                        onSelected: _saving ? null : (_) {
                          _section = section;
                          _refresh();
                        },
                      ),
                  ],
                ),
                if (_manage && _section == 'catalogue')
                  TextButton(
                    onPressed: _saving ? null : () => _edit(
                      title: 'Add catalogue item',
                      method: 'POST',
                      path: '$_base/branches/$branch/catalogue',
                      fields: const {'name': 'Item name', 'kind': 'Item type', 'priceMinor': 'Price in kobo'},
                      options: const {'kind': ['product', 'service', 'package', 'event']},
                      integers: const {'priceMinor'},
                    ),
                    child: const Text('Add item'),
                  ),
                if (_manage && _section == 'availability')
                  TextButton(
                    onPressed: _saving ? null : () => _edit(
                      title: 'Create availability slot',
                      method: 'POST',
                      path: '$_base/branches/$branch/availability',
                      fields: const {
                        'catalogueId': 'Published catalogue item ID',
                        'startsAt': 'Start date and time (ISO 8601 with offset)',
                        'endsAt': 'End date and time (ISO 8601 with offset)',
                        'capacity': 'Capacity',
                      },
                      integers: const {'capacity'},
                    ),
                    child: const Text('Add time slot'),
                  ),
                if (_owner && _section == 'staff')
                  for (final role in ['manager', 'staff'])
                    TextButton(
                      onPressed: _saving ? null : () => _edit(
                        title: 'Grant $role access',
                        method: 'POST',
                        path: '$_base/staff/grants',
                        fields: const {'subject': 'Faji account ID'},
                        values: {'role': role, if (role == 'staff') 'branchId': branch},
                      ),
                      child: Text('Add $role'),
                    ),
                if (data.records.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text('No $_section for this branch.'),
                  ),
                for (final row in data.records) _record(row, branch),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _record(Map<String, dynamic> row, String branch) {
    final id = (row['id'] ?? row['identity_subject']) as String;
    final next = _next(row['status']);
    final minor = int.tryParse('${row['total_minor'] ?? row['price_minor']}');
    final currency = row['currency'];
    final price = minor == null ? null : currency == 'NGN'
        ? money(minor)
        : '$currency ${(minor / 100).toStringAsFixed(2)}';
    final details = [
      if (row['role'] != null) _label(row['role']),
      if (row['status'] != null) _label(row['status']),
      if (price != null) price,
      if (row['published'] is bool) row['published'] == true ? 'Published' : 'Unpublished',
      if (row['guests'] != null) '${row['guests']} guests',
      if (row['starts_at'] != null) '${row['starts_at']}',
      if (row['capacity'] != null) '${row['reserved']} / ${row['capacity']} booked',
    ].join(' · ');
    return Card(
      child: ListTile(
        title: Text(row['name'] as String? ?? id),
        subtitle: Text(details),
        trailing: Wrap(
          children: [
            if (next != null)
              TextButton(
                onPressed: _saving ? null : () => _advance(branch, id, next),
                child: Text(_label(next)),
              ),
            if ((_section == 'orders' && next != null) ||
                (_section == 'reservations' && row['status'] == 'confirmed'))
              IconButton(
                tooltip: 'Cancel ${_section == 'orders' ? 'order' : 'reservation'}',
                onPressed: _saving ? null : () => _edit(
                  title: _section == 'orders' ? 'Cancel order?' : 'Cancel reservation?',
                  method: 'PATCH',
                  path: '$_base/branches/$branch/$_section/$id/status',
                  values: const {'status': 'cancelled'},
                ),
                icon: const Icon(Icons.cancel_outlined),
              ),
            if (_manage && (_section == 'catalogue' || _section == 'availability'))
              IconButton(
                tooltip: _section == 'catalogue' ? 'Edit item' : 'Change availability',
                onPressed: _saving ? null : () => _edit(
                  title: _section == 'catalogue' ? 'Edit catalogue item' :
                      row['active'] == true ? 'Deactivate time slot?' : 'Activate time slot?',
                  method: 'PATCH',
                  path: '$_base/branches/$branch/$_section/$id',
                  fields: _section == 'catalogue'
                      ? const {'name': 'Item name', 'priceMinor': 'Price in kobo'}
                      : const {},
                  integers: const {'priceMinor'},
                  values: _section == 'availability' ? {'active': row['active'] != true} : const {},
                ),
                icon: const Icon(Icons.edit_outlined),
              ),
            if (_manage && _section == 'catalogue')
              IconButton(
                tooltip: row['published'] == true ? 'Unpublish' : 'Publish',
                onPressed: _saving ? null : () => _edit(
                  title: row['published'] == true ? 'Unpublish item?' : 'Publish item?',
                  method: 'PATCH',
                  path: '$_base/branches/$branch/catalogue/$id',
                  values: {'published': row['published'] != true},
                ),
                icon: Icon(row['published'] == true ? Icons.visibility_off : Icons.visibility),
              ),
            if (_owner && _section == 'staff' &&
                (row['role'] == 'manager' || row['resource_type'] == 'branch'))
              IconButton(
                tooltip: 'Revoke access',
                onPressed: _saving ? null : () => _edit(
                  title: 'Revoke access?',
                  method: 'POST',
                  path: '$_base/staff/revocations',
                  values: {
                    'subject': id,
                    'role': row['role'] as String,
                    if (row['resource_type'] == 'branch') 'branchId': row['resource_id'] as String,
                  },
                ),
                icon: const Icon(Icons.person_remove_outlined),
              ),
          ],
        ),
      ),
    );
  }
}
