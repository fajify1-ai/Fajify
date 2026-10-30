import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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
        action: FilledButton.icon(
          onPressed: () => context.go('/menu/new'),
          icon: const Icon(Icons.add),
          label: const Text('Add Menu'),
        ),
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
                          money(item.amount),
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
                      onChanged: controller.busy
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
      title: widget.id == null ? 'Add menu item' : 'Edit menu item',
      subtitle: 'Local demo preview · changes reset when you log out',
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
                decoration: const InputDecoration(
                  labelText: 'Price in NGN',
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
                initialValue: category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: ['Mains', 'Starters', 'Drinks', 'Desserts']
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (value) => setState(() => category = value!),
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
                          category,
                          parsePrice(price.text)!,
                          available: available,
                          imageAsset: original?.imageAsset,
                        );
                        final ok = await c.saveMenu(item);
                        if (context.mounted) {
                          feedback(context, ok);
                          if (ok) context.go('/menu');
                        }
                      },
                child: Text(
                  widget.controller.busy
                      ? 'Saving sample…'
                      : 'Save sample item',
                ),
              ),
              TextButton(
                onPressed: () => context.go('/menu'),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
