import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_controller.dart';
import '../core/models.dart';
import '../shared/business_ui.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key, required this.controller});
  final BusinessController controller;
  @override
  Widget build(BuildContext context) {
    final data = controller.data;
    if (controller.state == LoadState.empty) {
      return PageBody(
        title: 'Dashboard',
        subtitle: 'Your business at a glance',
        children: [
          emptyState(
            'No sample activity. Use Demo controls to restore the populated scenario.',
          ),
        ],
      );
    }
    final active = data.orders
        .where((o) => o.stage != OrderStage.completed)
        .length;
    final completed = data.orders.length - active;
    final pending = data.reservations.where((r) => !r.confirmed).length;
    return PageBody(
      title: 'Dashboard',
      subtitle: 'Sunday, 30 August 2026 · Sample data',
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      "TODAY’S REVENUE",
                      style: TextStyle(color: muted, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go('/earnings'),
                    child: const Text('View balance'),
                  ),
                ],
              ),
              Text(
                money(14000000),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '+18.4% from last week',
                style: TextStyle(color: good, fontSize: 12),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Divider(),
              ),
              const Row(
                children: [
                  Expanded(child: _Metric('Available balance', '₦320,000')),
                  Expanded(child: _Metric('Customer rating', '4.8 / 5')),
                ],
              ),
            ],
          ),
        ),
        const Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text("Today’s capacity")),
                  Text('8 / 12 tables', style: TextStyle(color: brand)),
                ],
              ),
              SizedBox(height: 6),
              Text(
                'Table capacity',
                style: TextStyle(color: muted, fontSize: 12),
              ),
              SizedBox(height: 14),
              LinearProgressIndicator(
                value: 8 / 12,
                minHeight: 7,
                semanticsLabel: 'Eight of twelve tables booked',
              ),
              SizedBox(height: 10),
              Wrap(
                spacing: 24,
                children: [
                  Text('67% booked', style: TextStyle(color: muted)),
                  Text('4 tables available'),
                ],
              ),
            ],
          ),
        ),
        LayoutBuilder(
          builder: (context, constraints) => Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: (constraints.maxWidth - 12) / 2,
                child: Panel(
                  child: _Metric(
                    'RESERVATIONS',
                    '${data.reservations.length}',
                    detail: '$pending pending',
                  ),
                ),
              ),
              SizedBox(
                width: (constraints.maxWidth - 12) / 2,
                child: Panel(
                  child: _Metric(
                    'ORDERS',
                    '$active active',
                    detail: '$completed completed',
                  ),
                ),
              ),
            ],
          ),
        ),
        SectionHeading(
          'Next tasks',
          action: StatusPill('${pending + active}', color: brand),
        ),
        Panel(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.schedule, color: amber),
                title: Text('$pending bookings awaiting confirmation'),
                subtitle: const Text('Review your upcoming guests'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/reservations?pending=true'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.receipt_long_outlined, color: brand),
                title: Text('$active active orders'),
                subtitle: const Text('Keep your kitchen moving'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/orders'),
              ),
            ],
          ),
        ),
        const SectionHeading('Quick actions'),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _QuickAction(
              Icons.qr_code_scanner,
              'Scan QR',
              () => context.go('/scan?type=reservation'),
            ),
            _QuickAction(Icons.add, 'Add item', () => context.go('/menu/new')),
            _QuickAction(
              Icons.account_balance_wallet_outlined,
              'Withdraw',
              () => context.go('/earnings?withdraw=true'),
            ),
          ],
        ),
        const RevenueChart(),
        SectionHeading(
          'Upcoming',
          action: TextButton(
            onPressed: () => context.go('/reservations'),
            child: const Text('View all'),
          ),
        ),
        ...data.reservations
            .where((r) => !r.date.isBefore(DateTime(2026, 8, 30)))
            .map((r) => ReservationTile(reservation: r)),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, {this.detail});
  final String label;
  final String value;
  final String? detail;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(color: muted, fontSize: 12)),
      const SizedBox(height: 6),
      Text(
        value,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
      ),
      if (detail != null) ...[
        const SizedBox(height: 6),
        Text(detail!, style: const TextStyle(color: muted, fontSize: 12)),
      ],
    ],
  );
}

class _QuickAction extends StatelessWidget {
  const _QuickAction(this.icon, this.label, this.onTap);
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: brand),
          const SizedBox(height: 8),
          Text(label),
        ],
      ),
    ),
  );
}

class ReservationTile extends StatelessWidget {
  const ReservationTile({super.key, required this.reservation});
  final Reservation reservation;
  @override
  Widget build(BuildContext context) => Panel(
    padding: EdgeInsets.zero,
    child: ListTile(
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: brand.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          '${reservation.date.day}',
          style: const TextStyle(color: brand, fontSize: 18),
        ),
      ),
      title: Text(reservation.guest),
      subtitle: Text('${reservation.time} · ${reservation.party} guests'),
      trailing: StatusPill(
        reservation.confirmed ? 'Confirmed' : 'Pending',
        color: reservation.confirmed ? good : amber,
      ),
      onTap: () => context.go('/reservations/${reservation.id}'),
    ),
  );
}

class RevenueChart extends StatelessWidget {
  const RevenueChart({super.key});
  static const values = [65000, 110000, 90000, 140000, 115000, 180000, 153000];
  static const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  @override
  Widget build(BuildContext context) => Panel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Expanded(child: Text('Revenue this week')),
            StatusPill('+18.4%'),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          money(values.reduce((a, b) => a + b) * 100),
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 120,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(
              values.length,
              (i) => Expanded(
                child: Semantics(
                  label: '${days[i]} sample revenue ${money(values[i] * 100)}',
                  child: Tooltip(
                    message: money(values[i] * 100),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: values[i] / 180000 * 80,
                            decoration: BoxDecoration(
                              color: i == 6 ? brand : const Color(0xFF383838),
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            days[i],
                            style: const TextStyle(color: muted, fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
