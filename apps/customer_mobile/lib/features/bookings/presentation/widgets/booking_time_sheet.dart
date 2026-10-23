import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../data/models/booking_draft.dart';

class BookingTimeSheetResult {
  const BookingTimeSheetResult.backToDate();
}

class BookingTimeSheet extends StatefulWidget {
  const BookingTimeSheet({super.key, required this.draft});

  final BookingDraft draft;

  @override
  State<BookingTimeSheet> createState() => _BookingTimeSheetState();
}

class _BookingTimeSheetState extends State<BookingTimeSheet> {
  BookingTimePeriod? _selectedPeriod;

  @override
  void initState() {
    super.initState();
    _selectedPeriod = widget.draft.bookingTimePeriod;
  }

  bool _isSupported(BookingTimePeriod period) {
    final planTime = PlanTimeOfDay.values.firstWhere(
      (time) => time.name == period.name,
    );
    return widget.draft.plan.supportedTimes.contains(planTime);
  }

  DateTime _startFor(BookingTimePeriod period) => DateTime(
    widget.draft.bookingDate.year,
    widget.draft.bookingDate.month,
    widget.draft.bookingDate.day,
    period.startHour,
  );

  DateTime? _endFor(BookingTimePeriod period) => period.endHour == null
      ? null
      : DateTime(
          widget.draft.bookingDate.year,
          widget.draft.bookingDate.month,
          widget.draft.bookingDate.day,
          period.endHour!,
        );

  void _select(BookingTimePeriod period) {
    if (!_isSupported(period)) return;
    HapticFeedback.lightImpact();
    setState(() => _selectedPeriod = period);
  }

  void _continue() {
    final period = _selectedPeriod;
    if (period == null || !_isSupported(period)) return;
    Navigator.of(context).pop(
      widget.draft.copyWith(
        bookingTimePeriod: period,
        bookingStartTime: _startFor(period),
        bookingEndTime: _endFor(period),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final date = _formatDate(widget.draft.bookingDate);
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 10, 22, 18),
        decoration: const BoxDecoration(
          color: FajiColors.surfaceDark,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 30,
              height: 4,
              decoration: BoxDecoration(
                color: FajiColors.borderDark,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Pick a Time',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Material(
                  color: const Color(0xff101010),
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    customBorder: const CircleBorder(),
                    child: const SizedBox(
                      width: 36,
                      height: 36,
                      child: Icon(
                        Icons.close,
                        color: FajiColors.textSecondaryDark,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: () =>
                  Navigator.of(context)
                      .pop(const BookingTimeSheetResult.backToDate()),
              borderRadius: BorderRadius.circular(8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    '‹  $date',
                    style: const TextStyle(
                      color: FajiColors.textSecondaryDark,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 9),
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xff2d0d0e),
                  border: Border.all(color: FajiColors.primary),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  '▣  $date',
                  style: const TextStyle(
                    color: FajiColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 15),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Choose a time of day',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 10),
            ...BookingTimePeriod.values.map(
              (period) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _TimeOption(
                  period: period,
                  selected: _selectedPeriod == period,
                  enabled: _isSupported(period),
                  onTap: () => _select(period),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: FilledButton(
                onPressed: _selectedPeriod == null ? null : _continue,
                style: FilledButton.styleFrom(
                  backgroundColor: FajiColors.primary,
                  disabledBackgroundColor: const Color(0xff7d2a2a),
                  disabledForegroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: Text(
                  _selectedPeriod == null
                      ? 'Select a time to confirm'
                      : 'Continue',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeOption extends StatelessWidget {
  const _TimeOption({
    required this.period,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final BookingTimePeriod period;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xff2d0d0e) : const Color(0xff101010),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? FajiColors.primary : const Color(0xff303030),
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: enabled
                    ? selected
                          ? FajiColors.primary
                          : FajiColors.textSecondaryDark
                    : const Color(0xff414141),
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  period.label,
                  style: TextStyle(
                    color: enabled ? Colors.white : const Color(0xff555555),
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                period.range,
                style: TextStyle(
                  color: enabled
                      ? FajiColors.textSecondaryDark
                      : const Color(0xff454545),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDate(DateTime date) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${weekdays[date.weekday - 1]}, ${date.day} ${months[date.month - 1]} ${date.year}';
}
