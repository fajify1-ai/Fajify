import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_api.dart';
import '../core/business_controller.dart';
import '../core/models.dart';
import '../shared/business_ui.dart';

class MenuThumbnail extends StatelessWidget {
  const MenuThumbnail({super.key, required this.item});
  final MenuItem item;
  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: 56,
      height: 56,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: brand.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        item.category == 'Drinks'
            ? Icons.local_bar_outlined
            : item.category == 'Desserts'
            ? Icons.cake_outlined
            : Icons.restaurant_outlined,
        color: brand,
        semanticLabel: '${item.category} placeholder',
      ),
    );
    return item.imageAsset == null
        ? fallback
        : ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset(
              item.imageAsset!,
              width: 56,
              height: 56,
              fit: BoxFit.cover,
              errorBuilder: (_, error, stack) => fallback,
            ),
          );
  }
}

class MenuPage extends StatelessWidget {
  const MenuPage({super.key, required this.controller});
  final BusinessController controller;
  @override
  Widget build(BuildContext context) => PageBody(
    title: 'Menu',
    subtitle: 'Manage availability and pricing',
    children: [
      SectionHeading(
        '${controller.data.menu.length} menu items',
        action: controller.canManageBusiness
            ? FilledButton.icon(
                onPressed: () => context.go('/menu/new'),
                icon: const Icon(Icons.add),
                label: Text(
                  controller.isSample ? 'Add Menu' : 'Add catalogue item',
                ),
              )
            : null,
      ),
      if (controller.data.menu.isEmpty)
        emptyState(
          'No menu items yet. Add a sample item to preview your catalogue.',
        ),
      ...controller.data.menu.map(
        (item) => Panel(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              MenuThumbnail(item: item),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () => context.go('/menu/${item.id}'),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          item.category,
                          style: const TextStyle(color: muted, fontSize: 12),
                        ),
                        Text(
                          money(item.amount, currency: item.currency),
                          style: const TextStyle(color: brand),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Column(
                children: [
                  Semantics(
                    label: '${item.name} availability',
                    child: Switch(
                      value: item.available,
                      onChanged:
                          controller.busy || !controller.canManageBusiness
                          ? null
                          : (value) async {
                              final ok = await controller.saveMenu(
                                item.withAvailability(value),
                              );
                              if (context.mounted) feedback(context, ok);
                            },
                    ),
                  ),
                  Text(
                    item.available ? 'Available' : 'Off',
                    style: TextStyle(
                      color: item.available ? good : muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class MenuFormPage extends StatefulWidget {
  const MenuFormPage({super.key, required this.controller, this.id});
  final BusinessController controller;
  final String? id;
  @override
  State<MenuFormPage> createState() => _MenuFormPageState();
}

class _MenuFormPageState extends State<MenuFormPage> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final price = TextEditingController();
  String category = 'Mains';
  String kind = 'product';
  bool available = true;
  MenuItem? original;
  @override
  void initState() {
    super.initState();
    final matches = widget.controller.data.menu.where((m) => m.id == widget.id);
    if (matches.isNotEmpty) {
      original = matches.first;
      name.text = original!.name;
      price.text = (original!.amount / 100).toStringAsFixed(2);
      category = original!.category;
      kind = original!.kind;
      available = original!.available;
    }
  }

  @override
  void dispose() {
    name.dispose();
    price.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.id != null && original == null) {
      return PageBody(
        title: 'Menu item not found',
        subtitle: 'This sample item is unavailable.',
        children: [
          TextButton(
            onPressed: () => context.go('/menu'),
            child: const Text('Back to menu'),
          ),
        ],
      );
    }
    return PageBody(
      title: widget.id == null
          ? (widget.controller.isSample
                ? 'Add sample item'
                : 'Add catalogue item')
          : (widget.controller.isSample
                ? 'Edit sample item'
                : 'Edit catalogue item'),
      subtitle: widget.controller.isSample
          ? 'Local demo preview · changes reset when you log out'
          : 'Branch catalogue · server validation is authoritative',
      children: [
        Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: name,
                maxLength: 80,
                decoration: const InputDecoration(labelText: 'Item name'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Enter an item name' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: price,
                decoration: InputDecoration(
                  labelText: 'Price in ${original?.currency ?? 'NGN'}',
                  hintText: '7000.00',
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: (v) => parsePrice(v ?? '') == null
                    ? 'Enter a positive price with up to two decimals'
                    : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: widget.controller.isSample ? category : kind,
                decoration: InputDecoration(
                  labelText: widget.controller.isSample
                      ? 'Category'
                      : 'Catalogue type',
                ),
                items:
                    (widget.controller.isSample
                            ? ['Mains', 'Starters', 'Drinks', 'Desserts']
                            : ['product', 'service', 'package', 'event'])
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                onChanged: widget.id != null && !widget.controller.isSample
                    ? null
                    : (value) => setState(() {
                        if (widget.controller.isSample) {
                          category = value!;
                        } else {
                          kind = value!;
                        }
                      }),
              ),
              SwitchListTile(
                title: const Text('Available'),
                value: available,
                onChanged: (value) => setState(() => available = value),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: widget.controller.busy
                    ? null
                    : () async {
                        if (!form.currentState!.validate()) return;
                        final c = widget.controller;
                        final item = MenuItem(
                          widget.id ?? c.nextMenuId(),
                          name.text.trim(),
                          widget.controller.isSample ? category : kind,
                          parsePrice(price.text)!,
                          available: available,
                          imageAsset: original?.imageAsset,
                          kind: widget.controller.isSample ? 'product' : kind,
                          currency: original?.currency ?? 'NGN',
                          active: original?.active ?? true,
                        );
                        final ok = await c.saveMenu(item);
                        if (context.mounted) {
                          feedback(context, ok);
                          if (ok) context.go('/menu');
                        }
                      },
                child: Text(
                  widget.controller.busy
                      ? 'Saving…'
                      : widget.controller.isSample
                      ? 'Save sample item'
                      : 'Save catalogue item',
                ),
              ),
              TextButton(
                onPressed: () => context.go('/menu'),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
        if (!widget.controller.isSample &&
            original != null &&
            (original!.kind == 'event' || original!.kind == 'package'))
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  original!.kind == 'event'
                      ? 'Event configuration'
                      : 'Package components',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  original!.kind == 'event'
                      ? 'Set the event time window and maximum guest count.'
                      : 'Choose active same-branch catalogue items included in this package.',
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: widget.controller.busy
                      ? null
                      : original!.kind == 'event'
                      ? _configureEvent
                      : _configurePackage,
                  icon: const Icon(Icons.tune),
                  label: Text(
                    original!.kind == 'event'
                        ? 'Configure event'
                        : 'Configure components',
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _configureEvent() async {
    final controller = widget.controller;
    MerchantEventConfig? current;
    try {
      current = await controller.loadEventConfig(original!.id);
    } on BusinessApiFailure catch (failure) {
      if (failure.statusCode != 404) {
        if (mounted) _showFormError(controller.error ?? failure.message);
        return;
      }
    } on Exception {
      if (mounted) {
        _showFormError(controller.error ?? 'Could not load event settings.');
      }
      return;
    }
    if (!mounted) return;
    final config = await showDialog<Map<String, Object?>>(
      context: context,
      builder: (context) => _EventConfigDialog(initial: current),
    );
    if (config == null || !mounted) return;
    final saved = await controller.configureEvent(original!.id, config);
    if (mounted) {
      if (saved) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Event configuration saved.')),
        );
      } else {
        _showFormError(
          controller.error ?? 'Could not save event configuration.',
        );
      }
    }
  }

  Future<void> _configurePackage() async {
    final controller = widget.controller;
    List<MerchantPackageComponent> current;
    try {
      current = await controller.loadPackageComponents(original!.id);
    } on Exception {
      if (mounted) {
        _showFormError(
          controller.error ?? 'Could not load package components.',
        );
      }
      return;
    }
    if (!mounted) return;
    final candidates = controller.data.menu
        .where(
          (item) =>
              item.id != original!.id && item.kind != 'package' && item.active,
        )
        .toList(growable: false);
    if (candidates.isEmpty) {
      _showFormError('Add an active non-package catalogue item first.');
      return;
    }
    final components = await showDialog<List<Map<String, Object>>>(
      context: context,
      builder: (context) =>
          _PackageConfigDialog(candidates: candidates, initial: current),
    );
    if (components == null || !mounted) return;
    final saved = await controller.savePackageComponents(
      original!.id,
      components,
    );
    if (mounted) {
      if (saved) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Package components saved.')),
        );
      } else {
        _showFormError(
          controller.error ?? 'Could not save package components.',
        );
      }
    }
  }

  void _showFormError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _EventConfigDialog extends StatefulWidget {
  const _EventConfigDialog({required this.initial});

  final MerchantEventConfig? initial;

  @override
  State<_EventConfigDialog> createState() => _EventConfigDialogState();
}

class _EventConfigDialogState extends State<_EventConfigDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _guests = TextEditingController(
    text: '${widget.initial?.maxGuests ?? 20}',
  );
  late DateTime _startsAt =
      widget.initial?.startsAt.toLocal() ??
      DateTime.now().add(const Duration(days: 1));
  late DateTime _endsAt =
      widget.initial?.endsAt.toLocal() ??
      DateTime.now().add(const Duration(days: 1, hours: 2));

  @override
  void dispose() {
    _guests.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Configure event'),
    content: Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextFormField(
            controller: _guests,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Maximum guests'),
            validator: (value) {
              final parsed = int.tryParse(value ?? '');
              return parsed == null || parsed <= 0
                  ? 'Enter a positive guest limit.'
                  : null;
            },
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Starts'),
            subtitle: Text(_eventDateLabel(_startsAt)),
            onTap: () => _pick(true),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Ends'),
            subtitle: Text(_eventDateLabel(_endsAt)),
            onTap: () => _pick(false),
          ),
          if (!_endsAt.isAfter(_startsAt))
            const Text(
              'End must be after start.',
              style: TextStyle(color: Colors.red),
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
            'startsAt': _startsAt.toUtc().toIso8601String(),
            'endsAt': _endsAt.toUtc().toIso8601String(),
            'maxGuests': int.parse(_guests.text),
          });
        },
        child: const Text('Save'),
      ),
    ],
  );

  Future<void> _pick(bool start) async {
    final selected = start ? _startsAt : _endsAt;
    final date = await showDatePicker(
      context: context,
      initialDate: selected,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (!mounted || date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(selected),
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
      } else {
        _endsAt = value;
      }
    });
  }
}

class _PackageConfigDialog extends StatefulWidget {
  const _PackageConfigDialog({required this.candidates, required this.initial});

  final List<MenuItem> candidates;
  final List<MerchantPackageComponent> initial;

  @override
  State<_PackageConfigDialog> createState() => _PackageConfigDialogState();
}

class _PackageConfigDialogState extends State<_PackageConfigDialog> {
  late final List<_PackageLineInput> _lines = [
    for (final item in widget.initial)
      if (widget.candidates.any(
        (candidate) => candidate.id == item.catalogueId,
      ))
        _PackageLineInput(item.catalogueId, item.quantity),
  ];

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Package components'),
    content: SizedBox(
      width: 440,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_lines.isEmpty)
              const Text('Add at least one active same-branch item.'),
            for (var index = 0; index < _lines.length; index++)
              Row(
                children: [
                  Expanded(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _lines[index].catalogueId,
                      items: [
                        for (final candidate in widget.candidates)
                          DropdownMenuItem(
                            value: candidate.id,
                            child: Text(
                              candidate.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _lines[index].catalogueId = value);
                        }
                      },
                    ),
                  ),
                  SizedBox(
                    width: 72,
                    child: TextFormField(
                      initialValue: '${_lines[index].quantity}',
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Qty'),
                      onChanged: (value) {
                        _lines[index].quantity = int.tryParse(value) ?? 0;
                      },
                    ),
                  ),
                  IconButton(
                    tooltip: 'Remove component',
                    onPressed: () => setState(() => _lines.removeAt(index)),
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                ],
              ),
            TextButton.icon(
              onPressed: () {
                final selected = widget.candidates.firstWhere(
                  (candidate) =>
                      !_lines.any((line) => line.catalogueId == candidate.id),
                  orElse: () => widget.candidates.first,
                );
                if (_lines.length >= widget.candidates.length ||
                    _lines.any((line) => line.catalogueId == selected.id)) {
                  return;
                }
                setState(() => _lines.add(_PackageLineInput(selected.id, 1)));
              },
              icon: const Icon(Icons.add),
              label: const Text('Add component'),
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
        onPressed:
            _lines.isEmpty ||
                _lines.any((line) => line.quantity < 1) ||
                _lines.map((line) => line.catalogueId).toSet().length !=
                    _lines.length
            ? null
            : () => Navigator.pop(context, [
                for (final line in _lines)
                  <String, Object>{
                    'catalogueId': line.catalogueId,
                    'quantity': line.quantity,
                  },
              ]),
        child: const Text('Save'),
      ),
    ],
  );
}

class _PackageLineInput {
  _PackageLineInput(this.catalogueId, this.quantity);

  String catalogueId;
  int quantity;
}

String _eventDateLabel(DateTime value) =>
    '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')} '
    '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
