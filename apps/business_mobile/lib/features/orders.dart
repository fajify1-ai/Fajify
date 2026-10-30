import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_controller.dart';
import '../core/models.dart';
import '../shared/business_ui.dart';

Color orderColor(OrderStage s) => s == OrderStage.fresh
    ? brand
    : s == OrderStage.preparing
    ? amber
    : good;
String nextAction(OrderStage s) => switch (s) {
  OrderStage.fresh => 'Accept',
  OrderStage.preparing => 'Mark Ready',
  OrderStage.ready => 'Complete',
  OrderStage.completed => 'Completed',
};

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key, required this.controller});
  final BusinessController controller;
  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    bool matches(MerchantOrder o, String filter) => filter == 'Active'
        ? o.stage != OrderStage.completed
        : stageLabel(o.stage) == filter;
    final orders = c.data.orders.where((o) => matches(o, c.orderFilter));
    return PageBody(
      title: 'Orders',
      subtitle: 'Track every order from new to completed',
      children: [
        OutlinedButton.icon(
          onPressed: () => context.go('/scan?type=order'),
          icon: const Icon(Icons.qr_code_scanner, color: amber),
          label: const Text('Scan QR to Verify Order Recipient'),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: ['Active', 'New', 'Preparing', 'Ready', 'Completed']
                .map(
                  (filter) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(
                        '$filter ${c.data.orders.where((o) => matches(o, filter)).length}',
                      ),
                      selected: c.orderFilter == filter,
                      selectedColor: brand,
                      onSelected: (_) => setState(() => c.orderFilter = filter),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        if (orders.isEmpty)
          emptyState('No ${c.orderFilter.toLowerCase()} sample orders.'),
        ...orders.map((o) => OrderCard(controller: c, order: o)),
      ],
    );
  }
}

class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.controller,
    required this.order,
    this.detail = false,
  });
  final BusinessController controller;
  final MerchantOrder order;
  final bool detail;
  @override
  Widget build(BuildContext context) => Panel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                order.title,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 8),
            StatusPill(stageLabel(order.stage), color: orderColor(order.stage)),
          ],
        ),
        Text(
          '${order.guest} · ${order.minutesAgo} min ago',
          style: const TextStyle(color: muted, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          order.id.toUpperCase(),
          style: const TextStyle(color: brand, fontSize: 12),
        ),
        const Divider(height: 30),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 8,
          children: [
            Text(
              money(order.amount),
              style: const TextStyle(
                color: brand,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (!detail)
              TextButton(
                onPressed: () => context.go('/orders/${order.id}'),
                child: const Text('View details'),
              ),
            if (order.stage != OrderStage.completed)
              FilledButton(
                key: ValueKey('advance-${order.id}'),
                style: FilledButton.styleFrom(
                  backgroundColor: orderColor(order.stage),
                  foregroundColor: order.stage == OrderStage.fresh
                      ? Colors.white
                      : Colors.black,
                ),
                onPressed: controller.busy
                    ? null
                    : () async {
                        final ok = await controller.advance(order.id);
                        if (context.mounted) feedback(context, ok);
                      },
                child: Text(nextAction(order.stage)),
              ),
          ],
        ),
        if (detail) ...[
          const SizedBox(height: 12),
          const Text(
            'Local demo transition only. Live fulfilment and recipient verification arrive with backend integration.',
            style: TextStyle(color: muted),
          ),
        ],
      ],
    ),
  );
}

class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({
    super.key,
    required this.controller,
    required this.id,
  });
  final BusinessController controller;
  final String id;
  @override
  Widget build(BuildContext context) {
    final matches = controller.data.orders.where((o) => o.id == id);
    return PageBody(
      title: matches.isEmpty ? 'Order not found' : 'Order details',
      subtitle: id,
      children: [
        if (matches.isNotEmpty)
          OrderCard(controller: controller, order: matches.first, detail: true),
        OutlinedButton(
          onPressed: () => context.go('/orders'),
          child: const Text('Back to orders'),
        ),
      ],
    );
  }
}
