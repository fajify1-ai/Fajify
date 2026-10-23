import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_controller.dart';
import '../core/models.dart';
import '../shared/business_ui.dart';
import 'dashboard.dart';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
String dateLabel(DateTime date) =>
    '${date.day} ${monthNames[date.month - 1]} ${date.year}';

class ReservationsPage extends StatefulWidget {
  const ReservationsPage({
    super.key,
    required this.controller,
    this.pendingOnly = false,
  });
  final BusinessController controller;
  final bool pendingOnly;
  @override
  State<ReservationsPage> createState() => _ReservationsPageState();
}

class _ReservationsPageState extends State<ReservationsPage> {
  bool expanded = false;
  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final month = c.calendarMonth;
    final selected = c.data.reservations
        .where((r) => sameDay(r.date, c.selectedDate))
        .toList();
    final guests = selected.fold(0, (sum, r) => sum + r.party);
    final filtered = c.data.reservations
        .where((r) => !widget.pendingOnly || !r.confirmed)
        .toList();
    final offset = DateTime(month.year, month.month).weekday % 7;
    final days = DateTime(month.year, month.month + 1, 0).day;
    return PageBody(
      title: 'Reservations',
      subtitle: 'Review and manage guest bookings',
      children: [
        OutlinedButton.icon(
          onPressed: () => context.go('/scan?type=reservation'),
          icon: const Icon(Icons.qr_code_scanner, color: brand),
          label: const Text('Scan Guest QR — Check-in'),
        ),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('Calendar')),
            ButtonSegment(value: false, label: Text('All Reservations')),
          ],
          selected: {c.calendarView && !widget.pendingOnly},
          onSelectionChanged: (value) {
            setState(() => c.calendarView = value.first);
            if (widget.pendingOnly) context.go('/reservations');
          },
        ),
        if (c.calendarView && !widget.pendingOnly) ...[
          Panel(
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Previous month',
                      onPressed: () => setState(
                        () => c.calendarMonth = DateTime(
                          month.year,
                          month.month - 1,
                        ),
                      ),
                      icon: const Icon(Icons.chevron_left),
                    ),
                    Expanded(
                      child: Text(
                        '${monthNames[month.month - 1]} ${month.year}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Next month',
                      onPressed: () => setState(
                        () => c.calendarMonth = DateTime(
                          month.year,
                          month.month + 1,
                        ),
                      ),
                      icon: const Icon(Icons.chevron_right),
                    ),
                  ],
                ),
                const Text(
                  'Tap a day to see reservations',
                  style: TextStyle(color: muted, fontSize: 12),
                ),
                const SizedBox(height: 12),
                Row(
                  children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                      .map(
                        (d) => Expanded(
                          child: Center(
                            child: Text(
                              d,
                              style: const TextStyle(color: muted),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 8),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: ((offset + days + 6) ~/ 7) * 7,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisExtent: 64,
                    crossAxisSpacing: 2,
                    mainAxisSpacing: 2,
                  ),
                  itemBuilder: (context, index) {
                    final day = index - offset + 1;
                    if (day < 1 || day > days) return const SizedBox.shrink();
                    final date = DateTime(month.year, month.month, day);
                    final bookings = c.data.reservations
                        .where((r) => sameDay(r.date, date))
                        .length;
                    final chosen = sameDay(date, c.selectedDate);
                    return Semantics(
                      label: '${dateLabel(date)}, $bookings bookings',
                      selected: chosen,
                      child: InkWell(
                        key: ValueKey('day-${date.year}-${date.month}-$day'),
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => setState(() {
                          c.selectedDate = date;
                          expanded = false;
                        }),
                        child: Container(
                          decoration: BoxDecoration(
                            color: chosen
                                ? brand
                                : bookings > 0
                                ? brand.withValues(alpha: .10)
                                : null,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('$day'),
                                if (bookings > 0)
                                  Text(
                                    '$bookings bk',
                                    style: const TextStyle(fontSize: 10),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                const Text(
                  'Booking count shown below each date',
                  style: TextStyle(color: muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dateLabel(c.selectedDate),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  '${selected.length} bookings · Guest capacity',
                  style: const TextStyle(color: muted),
                ),
                const SizedBox(height: 14),
                LinearProgressIndicator(
                  value: (guests / 40).clamp(0, 1),
                  semanticsLabel: '$guests of 40 guest spaces reserved',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 24,
                  runSpacing: 8,
                  children: [
                    Text('40 capacity'),
                    Text('$guests reserved'),
                    Text(
                      '${40 - guests} remaining',
                      style: const TextStyle(color: good),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Panel(
            padding: EdgeInsets.zero,
            child: ExpansionTile(
              title: Text('View ${selected.length} reservations'),
              subtitle: const Text('Guest details and actions'),
              initiallyExpanded: expanded,
              onExpansionChanged: (value) => expanded = value,
              children: selected.isEmpty
                  ? [
                      const Padding(
                        padding: EdgeInsets.all(18),
                        child: Text('No reservations on this date.'),
                      ),
                    ]
                  : selected
                        .map(
                          (r) => ListTile(
                            title: Text(r.guest),
                            subtitle: Text('${r.time} · ${r.party} guests'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => context.go('/reservations/${r.id}'),
                          ),
                        )
                        .toList(),
            ),
          ),
        ] else ...[
          Text(
            widget.pendingOnly
                ? 'Pending reservations'
                : 'All sample reservations',
          ),
          if (filtered.isEmpty) emptyState('No reservations match this view.'),
          ...filtered.map((r) => ReservationTile(reservation: r)),
        ],
      ],
    );
  }
}

class ReservationDetailPage extends StatelessWidget {
  const ReservationDetailPage({
    super.key,
    required this.controller,
    required this.id,
  });
  final BusinessController controller;
  final String id;
  @override
  Widget build(BuildContext context) {
    final matches = controller.data.reservations.where((r) => r.id == id);
    if (matches.isEmpty) {
      return PageBody(
        title: 'Reservation not found',
        subtitle: 'This sample booking is unavailable.',
        children: [
          TextButton(
            onPressed: () => context.go('/reservations'),
            child: const Text('Back to reservations'),
          ),
        ],
      );
    }
    final r = matches.first;
    final checked = controller.checkedIn.contains(
      '${controller.businessId}:$id',
    );
    return PageBody(
      title: 'Reservation details',
      subtitle: r.id,
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(r.guest, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              Text('${dateLabel(r.date)} · ${r.time}'),
              Text('${r.party} guests'),
              const SizedBox(height: 12),
              StatusPill(
                checked
                    ? 'Demo checked in'
                    : r.confirmed
                    ? 'Confirmed'
                    : 'Pending',
                color: checked || r.confirmed ? good : amber,
              ),
            ],
          ),
        ),
        FilledButton.icon(
          onPressed: () => context.go('/scan?type=reservation'),
          icon: const Icon(Icons.qr_code_scanner),
          label: const Text('Preview guest check-in'),
        ),
        OutlinedButton(
          onPressed: () => context.go('/reservations'),
          child: const Text('Back to reservations'),
        ),
      ],
    );
  }
}
