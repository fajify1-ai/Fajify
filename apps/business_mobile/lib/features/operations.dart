import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_api.dart';
import '../core/business_controller.dart';
import '../core/models.dart';
import '../shared/business_ui.dart';

class OperationsPage extends StatefulWidget {
  const OperationsPage({super.key, required this.controller});

  final BusinessController controller;

  @override
  State<OperationsPage> createState() => _OperationsPageState();
}

class _OperationsPageState extends State<OperationsPage> {
  List<BranchHour> _hours = const [];
  bool _loadingHours = false;
  bool _hoursValid = true;
  String? _loadedBranch;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_controllerChanged);
    _loadHours();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_controllerChanged);
    super.dispose();
  }

  void _controllerChanged() {
    final branchId = widget.controller.selectedBranchId;
    if (branchId != _loadedBranch && !_loadingHours) _loadHours();
  }

  Future<void> _loadHours() async {
    final branchId = widget.controller.selectedBranchId;
    if (branchId == null || widget.controller.isSample) return;
    _loadedBranch = branchId;
    setState(() => _loadingHours = true);
    try {
      final hours = await widget.controller.loadBranchHours();
      if (mounted && widget.controller.selectedBranchId == branchId) {
        setState(() {
          _hours = hours;
          _hoursValid = true;
        });
      }
    } on Exception {
      // The controller exposes the server error in the operations page.
    } finally {
      if (mounted) setState(() => _loadingHours = false);
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final controller = widget.controller;
      final branch = controller.selectedBranch;
      if (controller.isSample) {
        return const Scaffold(
          body: SafeArea(
            child: PageBody(
              title: 'Branch operations',
              subtitle:
                  'Branch settings and availability require a live business workspace.',
              children: [
                _InfoNotice(
                  icon: Icons.info_outline,
                  title: 'Sample mode',
                  message:
                      'No branch settings or availability are changed in sample mode.',
                ),
              ],
            ),
          ),
        );
      }
      return Scaffold(
        body: SafeArea(
          child: PageBody(
            title: 'Branch operations',
            subtitle: branch == null
                ? 'Create a branch to configure its operating hours and availability.'
                : 'Manage settings and capacity for ${branch.name}.',
            children: [
              if (controller.error != null)
                _InfoNotice(
                  icon: Icons.error_outline,
                  title: 'Request failed',
                  message: controller.error!,
                ),
              if (branch == null) ...[
                const _InfoNotice(
                  icon: Icons.storefront_outlined,
                  title: 'No active branch',
                  message: 'Create a branch before setting its availability.',
                ),
                if (controller.canManageBusiness)
                  FilledButton.icon(
                    onPressed:
                        controller.busy || controller.state == LoadState.loading
                        ? null
                        : _createBranch,
                    icon: const Icon(Icons.add_business_outlined),
                    label: const Text('Create branch'),
                  ),
              ] else ...[
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.storefront_outlined),
                    title: Text(branch.name),
                    subtitle: Text(
                      '${branch.timezone} · ${branch.active ? 'Active' : 'Inactive'}',
                    ),
                    trailing: controller.canManageBusiness
                        ? IconButton(
                            tooltip: 'Edit branch settings',
                            onPressed: controller.busy ? null : _editBranch,
                            icon: const Icon(Icons.edit_outlined),
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12),
                _hoursSection(controller),
                const SizedBox(height: 12),
                _availabilitySection(controller),
                if (controller.isBusinessOwner) ...[
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () => context.go('/staff'),
                    icon: const Icon(Icons.people_outline),
                    label: const Text('Manage staff access'),
                  ),
                ],
              ],
            ],
          ),
        ),
      );
    },
  );

  Widget _hoursSection(BusinessController controller) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Operating hours',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (_loadingHours)
            const LinearProgressIndicator()
          else
            for (var weekday = 0; weekday <= 6; weekday++)
              _HourRow(
                weekday: weekday,
                hour: _hours
                    .where((hour) => hour.weekday == weekday)
                    .firstOrNull,
                onValidityChanged: (valid) {
                  if (_hoursValid != valid) setState(() => _hoursValid = valid);
                },
                onChanged: (hour) => setState(() {
                  _hours = [
                    ..._hours.where((value) => value.weekday != weekday),
                    if (hour != null) hour,
                  ]..sort((a, b) => a.weekday.compareTo(b.weekday));
                }),
              ),
          if (!_hoursValid)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Enter valid 24-hour times and ensure closing is after opening.',
                style: TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: controller.busy || _loadingHours || !_hoursValid
                ? null
                : _saveHours,
            child: const Text('Save operating hours'),
          ),
        ],
      ),
    ),
  );

  Widget _availabilitySection(BusinessController controller) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Availability',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              IconButton(
                tooltip: 'Add availability',
                onPressed: controller.busy ? null : _createAvailability,
                icon: const Icon(Icons.add_circle_outline),
              ),
            ],
          ),
          if (controller.availabilityRecords.isEmpty)
            const Text('No availability slots are configured for this branch.')
          else
            for (final slot in controller.availabilityRecords)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: slot.active,
                onChanged: controller.busy
                    ? null
                    : (active) async {
                        final saved = await controller.setAvailabilityActive(
                          slot.id,
                          active,
                        );
                        if (!saved && mounted) _showError(controller.error);
                      },
                title: Text(_dateLabel(slot.startsAt)),
                subtitle: Text(
                  '${_timeLabel(slot.startsAt)}–${_timeLabel(slot.endsAt)} · '
                  '${slot.reserved}/${slot.capacity} reserved',
                ),
              ),
        ],
      ),
    ),
  );

  Future<void> _saveHours() async {
    final saved = await widget.controller.saveBranchHours(_hours);
    if (mounted && !saved) _showError(widget.controller.error);
    if (mounted && saved) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Operating hours saved.')));
    }
  }

  Future<void> _createBranch() async {
    final form = await _branchDialog();
    if (form == null || !mounted) return;
    final saved = await widget.controller.createBranch(form);
    if (mounted && !saved) _showError(widget.controller.error);
  }

  Future<void> _editBranch() async {
    final branch = widget.controller.selectedBranch;
    if (branch == null) return;
    final form = await _branchDialog(branch: branch);
    if (form == null || !mounted) return;
    final saved = await widget.controller.updateBranch(form);
    if (mounted && !saved) _showError(widget.controller.error);
  }

  Future<Map<String, Object?>?> _branchDialog({MerchantBranch? branch}) =>
      showDialog<Map<String, Object?>>(
        context: context,
        builder: (_) => _BranchDialog(branch: branch),
      );

  Future<void> _createAvailability() async {
    final catalogue = widget.controller.data.menu
        .where((item) => item.active && item.available)
        .toList();
    if (catalogue.isEmpty) {
      _showError(
        'Publish an active catalogue item before adding availability.',
      );
      return;
    }
    final selected = await showDialog<Map<String, Object?>>(
      context: context,
      builder: (context) => _AvailabilityDialog(catalogue: catalogue),
    );
    if (selected == null || !mounted) return;
    final saved = await widget.controller.createAvailability(selected);
    if (mounted && !saved) _showError(widget.controller.error);
  }

  void _showError(String? message) {
    if (message == null || message.isEmpty) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _BranchDialog extends StatefulWidget {
  const _BranchDialog({this.branch});

  final MerchantBranch? branch;

  @override
  State<_BranchDialog> createState() => _BranchDialogState();
}

class _BranchDialogState extends State<_BranchDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.branch?.name ?? '');
  late final _timezone = TextEditingController(
    text: widget.branch?.timezone ?? 'Africa/Lagos',
  );
  late final _address = TextEditingController(
    text: widget.branch?.address ?? '',
  );
  late final _email = TextEditingController(
    text: widget.branch?.contactEmail ?? '',
  );
  late bool _active = widget.branch?.active ?? true;

  @override
  void dispose() {
    _name.dispose();
    _timezone.dispose();
    _address.dispose();
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final branch = widget.branch;
    return AlertDialog(
      title: Text(branch == null ? 'Create branch' : 'Branch settings'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Branch name'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter a branch name.'
                    : null,
              ),
              if (branch == null) ...[
                TextFormField(
                  controller: _timezone,
                  decoration: const InputDecoration(labelText: 'Timezone'),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Enter a timezone.'
                      : null,
                ),
                TextFormField(
                  controller: _address,
                  decoration: const InputDecoration(
                    labelText: 'Address (optional)',
                  ),
                ),
              ],
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: branch == null
                      ? 'Contact email (optional)'
                      : 'Contact email (leave blank to keep current)',
                ),
              ),
              if (branch != null)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Branch active'),
                  value: _active,
                  onChanged: (value) => setState(() => _active = value),
                ),
            ],
          ),
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
            Navigator.pop(context, {
              'name': _name.text.trim(),
              'contactEmail': _email.text.trim().isEmpty
                  ? null
                  : _email.text.trim(),
              if (branch == null) ...{
                'timezone': _timezone.text.trim(),
                'address': _address.text.trim().isEmpty
                    ? null
                    : _address.text.trim(),
              } else
                'active': _active,
            });
          },
          child: Text(branch == null ? 'Create' : 'Save'),
        ),
      ],
    );
  }
}

class _HourRow extends StatefulWidget {
  const _HourRow({
    required this.weekday,
    required this.hour,
    required this.onValidityChanged,
    required this.onChanged,
  });

  final int weekday;
  final BranchHour? hour;
  final ValueChanged<bool> onValidityChanged;
  final ValueChanged<BranchHour?> onChanged;

  @override
  State<_HourRow> createState() => _HourRowState();
}

class _HourRowState extends State<_HourRow> {
  late final TextEditingController _opens;
  late final TextEditingController _closes;
  bool _closed = false;

  @override
  void initState() {
    super.initState();
    _closed = widget.hour == null;
    _opens = TextEditingController(
      text: _format(widget.hour?.opensMinute ?? 540),
    );
    _closes = TextEditingController(
      text: _format(widget.hour?.closesMinute ?? 1020),
    );
  }

  @override
  void didUpdateWidget(covariant _HourRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.hour != widget.hour) {
      _closed = widget.hour == null;
      _opens.text = _format(widget.hour?.opensMinute ?? 540);
      _closes.text = _format(widget.hour?.closesMinute ?? 1020);
    }
  }

  @override
  void dispose() {
    _opens.dispose();
    _closes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Row(
    children: [
      SizedBox(width: 92, child: Text(_weekdayLabel(widget.weekday))),
      Checkbox(
        value: !_closed,
        onChanged: (open) {
          setState(() => _closed = !(open ?? false));
          _notify();
        },
      ),
      if (_closed)
        const Expanded(child: Text('Closed'))
      else ...[
        Expanded(
          child: TextField(
            controller: _opens,
            decoration: InputDecoration(
              labelText: 'Opens',
              hintText: '09:00',
              errorText: _minute(_opens.text) == null ? 'Use HH:mm' : null,
            ),
            onChanged: (_) => _notify(),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: _closes,
            decoration: InputDecoration(
              labelText: 'Closes',
              hintText: '17:00',
              errorText: _minute(_closes.text, allowEndOfDay: true) == null
                  ? 'Use HH:mm'
                  : null,
            ),
            onChanged: (_) => _notify(),
          ),
        ),
      ],
    ],
  );

  void _notify() {
    final opens = _minute(_opens.text);
    final closes = _minute(_closes.text, allowEndOfDay: true);
    if (_closed) {
      widget.onValidityChanged(true);
      widget.onChanged(null);
    } else {
      final valid = opens != null && closes != null && closes > opens;
      widget.onValidityChanged(valid);
      if (valid) widget.onChanged(BranchHour(widget.weekday, opens, closes));
      setState(() {});
    }
  }
}

class _AvailabilityDialog extends StatefulWidget {
  const _AvailabilityDialog({required this.catalogue});

  final List<MenuItem> catalogue;

  @override
  State<_AvailabilityDialog> createState() => _AvailabilityDialogState();
}

class _AvailabilityDialogState extends State<_AvailabilityDialog> {
  final _formKey = GlobalKey<FormState>();
  final _capacity = TextEditingController(text: '1');
  late String _catalogueId = widget.catalogue.first.id;
  DateTime _startsAt = DateTime.now().add(const Duration(days: 1));
  DateTime _endsAt = DateTime.now().add(const Duration(days: 1, hours: 1));

  @override
  void dispose() {
    _capacity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Add availability'),
    content: Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _catalogueId,
            decoration: const InputDecoration(labelText: 'Catalogue item'),
            items: [
              for (final item in widget.catalogue)
                DropdownMenuItem<String>(
                  value: item.id,
                  child: Text(item.name, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _catalogueId = value);
            },
          ),
          TextFormField(
            controller: _capacity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Capacity'),
            validator: (value) {
              final parsed = int.tryParse(value ?? '');
              return parsed == null || parsed <= 0
                  ? 'Enter a positive capacity.'
                  : null;
            },
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Starts'),
            subtitle: Text(_dateLabel(_startsAt)),
            onTap: () => _pick(true),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Ends'),
            subtitle: Text(_dateLabel(_endsAt)),
            onTap: () => _pick(false),
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
          if (!_formKey.currentState!.validate() ||
              !_endsAt.isAfter(_startsAt)) {
            return;
          }
          Navigator.pop(context, {
            'catalogueId': _catalogueId,
            'startsAt': _startsAt.toUtc().toIso8601String(),
            'endsAt': _endsAt.toUtc().toIso8601String(),
            'capacity': int.parse(_capacity.text),
          });
        },
        child: const Text('Create'),
      ),
    ],
  );

  Future<void> _pick(bool start) async {
    final current = start ? _startsAt : _endsAt;
    final date = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (!mounted || date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
    );
    if (!mounted || time == null) return;
    final value = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (start) {
        _startsAt = value;
        if (!_endsAt.isAfter(value)) {
          _endsAt = value.add(const Duration(hours: 1));
        }
      } else {
        _endsAt = value;
      }
    });
  }
}

String _weekdayLabel(int weekday) => const [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
][weekday];

int? _minute(String value, {bool allowEndOfDay = false}) {
  if (allowEndOfDay && value.trim() == '24:00') return 1440;
  final match = RegExp(
    r'^([0-1]\d|2[0-3]):([0-5]\d)$',
  ).firstMatch(value.trim());
  if (match == null) return null;
  return int.parse(match[1]!) * 60 + int.parse(match[2]!);
}

String _format(int minutes) =>
    '${(minutes ~/ 60).toString().padLeft(2, '0')}:${(minutes % 60).toString().padLeft(2, '0')}';

String _dateLabel(DateTime value) =>
    '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')} '
    '${_timeLabel(value)}';

String _timeLabel(DateTime value) =>
    '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

class _InfoNotice extends StatelessWidget {
  const _InfoNotice({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Panel(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 4),
              Text(message),
            ],
          ),
        ),
      ],
    ),
  );
}
