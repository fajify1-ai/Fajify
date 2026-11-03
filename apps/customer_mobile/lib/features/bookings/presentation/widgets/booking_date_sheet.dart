import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../../plans/data/models/plan_option.dart';
import '../../data/models/booking_draft.dart';

class BookingDateSheet extends StatefulWidget {
  const BookingDateSheet({
    super.key,
    required this.plan,
    required this.flowState,
    this.initialDate,
  });

  final PlanOption plan;
  final PlanForMeFlowState flowState;
  final DateTime? initialDate;

  @override
  State<BookingDateSheet> createState() => _BookingDateSheetState();
}

class _BookingDateSheetState extends State<BookingDateSheet> {
  late DateTime _displayedMonth;
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    final preferred = widget.flowState.selectedDate;
    _selectedDate = widget.initialDate;
    _displayedMonth = DateTime(
      (widget.initialDate ?? preferred)?.year ?? DateTime.now().year,
      (widget.initialDate ?? preferred)?.month ?? DateTime.now().month,
    );
  }

  DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  bool _isAvailable(DateTime date) {
    final today = _today();
    return !date.isBefore(today) &&
        widget.plan.availableWeekdays.contains(date.weekday);
  }

  void _changeMonth(int offset) {
    final next = DateTime(_displayedMonth.year, _displayedMonth.month + offset);
    final current = DateTime(_today().year, _today().month);
    if (next.isBefore(current)) return;
    setState(() => _displayedMonth = next);
  }

  void _selectDate(DateTime date) {
    if (!_isAvailable(date)) return;
    HapticFeedback.lightImpact();
    setState(() => _selectedDate = date);
  }

  void _continue() {
    final date = _selectedDate;
    if (date == null) return;
    Navigator.of(context).pop(
      BookingDraft(
        plan: widget.plan,
        flowState: widget.flowState,
        bookingDate: date,
        people: widget.flowState.exactPeopleCount,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                    'Pick a Date',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _SheetIconButton(
                  icon: Icons.close,
                  onTap: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _SheetIconButton(
                  icon: Icons.chevron_left,
                  onTap: () => _changeMonth(-1),
                  enabled: !_isCurrentMonth,
                ),
                Expanded(
                  child: Center(
                    child: Text(
                      _monthLabel(_displayedMonth),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                _SheetIconButton(
                  icon: Icons.chevron_right,
                  onTap: () => _changeMonth(1),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                  .map(
                    (day) => Expanded(
                      child: Center(
                        child: Text(
                          day,
                          style: const TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 5),
            _CalendarGrid(
              month: _displayedMonth,
              selectedDate: _selectedDate,
              isAvailable: _isAvailable,
              onSelected: _selectDate,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: FilledButton(
                onPressed: _selectedDate == null ? null : _continue,
                style: FilledButton.styleFrom(
                  backgroundColor: FajiColors.primary,
                  disabledBackgroundColor: const Color(0xff7d2a2a),
                  disabledForegroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: Text(
                  _selectedDate == null
                      ? 'Select a date to continue'
                      : 'Continue with ${_shortDate(_selectedDate!)}',
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

  bool get _isCurrentMonth {
    final today = _today();
    return _displayedMonth.year == today.year &&
        _displayedMonth.month == today.month;
  }
}

class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.month,
    required this.selectedDate,
    required this.isAvailable,
    required this.onSelected,
  });

  final DateTime month;
  final DateTime? selectedDate;
  final bool Function(DateTime date) isAvailable;
  final ValueChanged<DateTime> onSelected;

  @override
  Widget build(BuildContext context) {
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leadingDays = DateTime(month.year, month.month, 1).weekday % 7;
    final totalCells = ((leadingDays + daysInMonth + 6) ~/ 7) * 7;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: totalCells,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisExtent: 38,
      ),
      itemBuilder: (context, index) {
        final dayNumber = index - leadingDays + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
          return const SizedBox.shrink();
        }
        final date = DateTime(month.year, month.month, dayNumber);
        final available = isAvailable(date);
        final selected =
            selectedDate?.year == date.year &&
            selectedDate?.month == date.month &&
            selectedDate?.day == date.day;
        return Center(
          child: Material(
            color: selected ? FajiColors.primary : Colors.transparent,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: available ? () => onSelected(date) : null,
              customBorder: const CircleBorder(),
              child: SizedBox(
                width: 38,
                height: 38,
                child: Center(
                  child: Text(
                    '$dayNumber',
                    style: TextStyle(
                      color: selected
                          ? Colors.white
                          : available
                          ? FajiColors.textPrimaryDark
                          : const Color(0xff414141),
                      fontSize: 13,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SheetIconButton extends StatelessWidget {
  const _SheetIconButton({
    required this.icon,
    required this.onTap,
    this.enabled = true,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xff101010),
    shape: const CircleBorder(),
    child: InkWell(
      onTap: enabled ? onTap : null,
      customBorder: const CircleBorder(),
      child: SizedBox(
        width: 36,
        height: 36,
        child: Icon(
          icon,
          size: 18,
          color: enabled
              ? FajiColors.textPrimaryDark
              : FajiColors.textSecondaryDark,
        ),
      ),
    ),
  );
}

String _monthLabel(DateTime date) {
  const months = [
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
  return '${months[date.month - 1]} ${date.year}';
}

String _shortDate(DateTime date) =>
    '${_monthLabel(date).split(' ').first.substring(0, 3)} ${date.day}';
