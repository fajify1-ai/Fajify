import 'package:flutter/material.dart';

import '../core/business_controller.dart';
import '../shared/business_ui.dart';

const serviceColors = [
  brand,
  amber,
  Color(0xFFB99AFF),
  good,
  Color(0xFF84B2FF),
  Color(0xFFFFAD70),
  Color(0xFFFF8CC6),
  Color(0xFF6DDCC6),
];

class ServicesPage extends StatelessWidget {
  const ServicesPage({super.key, required this.controller, this.onExit});
  final BusinessController controller;
  final VoidCallback? onExit;
  @override
  Widget build(BuildContext context) => PageBody(
    title: 'Services',
    subtitle: 'Choose which Faji tools your business uses',
    children: [
      Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'FAJI BUSINESS SUITE',
              style: TextStyle(color: brand, fontSize: 12, letterSpacing: 1.3),
            ),
            const SizedBox(height: 12),
            Text(
              '${controller.data.services.where((s) => s.enabled).length} of ${controller.data.services.length} active',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 10),
            const Text(
              'Preview your business capabilities. All switches affect this demo session only.',
              style: TextStyle(color: muted),
            ),
          ],
        ),
      ),
      if (controller.data.services.isEmpty)
        emptyState(
          'No sample services. Restore populated data from Demo controls.',
        ),
      ...controller.data.services.indexed.map((entry) {
        final service = entry.$2;
        final color = serviceColors[entry.$1 % serviceColors.length];
        Future<void> change(bool enabled) async {
          final id = controller.businessId;
          final confirmed = await confirmDemo(
            context,
            '${enabled ? 'Enable' : 'Disable'} ${service.name}?',
            'This changes a local preview only. It does not publish a service or activate an integration.',
          );
          if (!confirmed || id != controller.businessId || !context.mounted) {
            return;
          }
          final ok = await controller.setService(service.id, enabled);
          if (context.mounted) feedback(context, ok);
        }

        return Panel(
          borderColor: service.enabled ? color.withValues(alpha: .45) : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          service.name,
                          style: TextStyle(
                            color: service.enabled ? color : Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          service.description,
                          style: const TextStyle(color: muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    label: '${service.name} demo activation',
                    child: Switch(
                      value: service.enabled,
                      activeThumbColor: Colors.white,
                      activeTrackColor: color,
                      onChanged: controller.busy ? null : change,
                    ),
                  ),
                ],
              ),
              const Divider(height: 28),
              if (service.enabled)
                LayoutBuilder(
                  builder: (context, constraints) => Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      SizedBox(
                        width: (constraints.maxWidth - 10) / 2,
                        child: _ServiceMetric(
                          service.metricLabel,
                          service.metricValue,
                          color,
                        ),
                      ),
                      SizedBox(
                        width: (constraints.maxWidth - 10) / 2,
                        child: _ServiceMetric(
                          service.amountLabel,
                          '₦${_amount(service.amount)}',
                          color,
                        ),
                      ),
                    ],
                  ),
                )
              else
                OutlinedButton(
                  onPressed: controller.busy ? null : () => change(true),
                  child: Text(
                    'Enable ${service.name}',
                    style: TextStyle(color: color),
                  ),
                ),
            ],
          ),
        );
      }),
      OutlinedButton.icon(
        onPressed:
            onExit ??
            () => preview(
              context,
              'Customer app handoff',
              'The customer application is a separate workstream. Its verified app or website link will be connected after Developer 2 publishes the handoff contract.',
            ),
        icon: const Icon(Icons.swap_horiz),
        label: const Text('Switch to Customer App'),
      ),
      TextButton(onPressed: controller.logout, child: const Text('Log Out')),
    ],
  );
}

String _amount(int amount) => (amount ~/ 100).toString().replaceAllMapped(
  RegExp(r'\B(?=(\d{3})+(?!\d))'),
  (_) => ',',
);

class _ServiceMetric extends StatelessWidget {
  const _ServiceMetric(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .07),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: color, fontSize: 10)),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    ),
  );
}
