import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../plans/presentation/screens/plan_results_screen.dart';

enum PlanType {
  date('👩‍❤️‍👨', 'Date'),
  birthday('🎂', 'Birthday'),
  friendsHangout('🥂', 'Friends Hangout'),
  workCorporate('💼', 'Work / Corporate'),
  familyTime('👨‍👩‍👧', 'Family Time'),
  justVibes('✨', 'Just Vibes');

  const PlanType(this.emoji, this.label);

  final String emoji;
  final String label;
}

class PlanForMeFlowState {
  PlanForMeFlowState({this.planType, this.exactPeopleCount = 6});

  PlanType? planType;
  int? exactPeopleCount;
  PeopleRange? peopleRange;
  String? selectedLocation;
  PlanBudget? selectedBudget;
  PlanDateOption? selectedDateOption;
  DateTime? selectedDate;
  PlanTimeOfDay? selectedTimeOfDay;
  String? selectedTimeRange;
  Set<PlanVibe> selectedVibes = <PlanVibe>{};
}

enum PeopleRange {
  oneToTwo('1–2'),
  threeToFive('3–5'),
  sixToTen('6–10'),
  elevenToTwenty('11–20'),
  twentyPlus('20+');

  const PeopleRange(this.label);

  final String label;
}

enum PlanBudget {
  under20k('Under ₦20K', 'Great value picks', 0, 20000),
  twentyTo50k('₦20K – ₦50K', 'Popular range', 20000, 50000),
  fiftyTo100k('₦50K – ₦100K', 'Mid-range comfort', 50000, 100000),
  hundredTo200k('₦100K – ₦200K', 'Premium experiences', 100000, 200000),
  twoHundredPlus('₦200K+', 'Ultra-luxury', 200000, null),
  notSure('Not sure?', 'Show me options across different budgets', null, null);

  const PlanBudget(this.label, this.description, this.min, this.max);

  final String label;
  final String description;
  final int? min;
  final int? max;
}

enum PlanDateOption { today, tomorrow, weekend, custom }

enum PlanTimeOfDay {
  morning('Morning', '7am – 12pm', '☀️'),
  afternoon('Afternoon', '12pm – 4pm', '🌤️'),
  evening('Evening', '4pm – 9pm', '🌆'),
  night('Night', '9pm – late', '🌙');

  const PlanTimeOfDay(this.label, this.range, this.icon);

  final String label;
  final String range;
  final String icon;
}

enum PlanVibe {
  chill('😌', 'Chill'),
  romantic('🌹', 'Romantic'),
  fun('🎉', 'Fun'),
  lively('⚡', 'Lively'),
  classy('🥂', 'Classy'),
  adventurous('🏕️', 'Adventurous'),
  casual('👟', 'Casual');

  const PlanVibe(this.emoji, this.label);

  final String emoji;
  final String label;
}

class PlanForMeStepOneScreen extends StatefulWidget {
  const PlanForMeStepOneScreen({super.key});

  @override
  State<PlanForMeStepOneScreen> createState() =>
      _PlanForMeStepOneScreenState();
}

class _PlanForMeStepOneScreenState extends State<PlanForMeStepOneScreen> {
  final _flowState = PlanForMeFlowState();

  void _selectPlanType(PlanType type) {
    HapticFeedback.lightImpact();
    setState(() => _flowState.planType = type);
  }

  void _continue() {
    final selectedPlanType = _flowState.planType;
    if (selectedPlanType == null) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanForMeStepTwoPlaceholderScreen(
          flowState: _flowState,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedPlanType = _flowState.planType;

    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 1 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(),
                    const SizedBox(height: 34),
                    const Text(
                      'What are you\nplanning?',
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Pick what feels right.',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 26),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: PlanType.values.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisExtent: 112,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                      itemBuilder: (context, index) {
                        final type = PlanType.values[index];
                        return _PlanTypeCard(
                          type: type,
                          selected: selectedPlanType == type,
                          onTap: () => _selectPlanType(type),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: selectedPlanType == null ? null : _continue,
                  style: FilledButton.styleFrom(
                    backgroundColor: FajiColors.primary,
                    disabledBackgroundColor: const Color(0xffffaaa9),
                    disabledForegroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Continue',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
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

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: FajiColors.surfaceDark,
      shape: const CircleBorder(
        side: BorderSide(color: FajiColors.borderDark),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: const SizedBox(
          width: 48,
          height: 48,
          child: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: FajiColors.textSecondaryDark,
            size: 21,
          ),
        ),
      ),
    );
  }
}

class _ProgressIndicator extends StatelessWidget {
  const _ProgressIndicator({this.completedSteps = 1});

  final int completedSteps;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(
        6,
        (index) => Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: index == 5 ? 0 : 7),
            decoration: BoxDecoration(
              color: index < completedSteps
                  ? FajiColors.primary
                  : FajiColors.borderDark,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      ),
    );
  }
}

class _PlanTypeCard extends StatelessWidget {
  const _PlanTypeCard({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final PlanType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xff292020) : FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(17),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(17),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(type.emoji, style: const TextStyle(fontSize: 31)),
                    const SizedBox(height: 8),
                    Text(
                      type.label,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Positioned(
                  top: 9,
                  right: 10,
                  child: Icon(
                    Icons.check_circle,
                    color: FajiColors.primary,
                    size: 19,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class PlanForMeStepTwoPlaceholderScreen extends StatefulWidget {
  const PlanForMeStepTwoPlaceholderScreen({
    super.key,
    required this.flowState,
  });

  final PlanForMeFlowState flowState;

  @override
  State<PlanForMeStepTwoPlaceholderScreen> createState() =>
      _PlanForMeStepTwoScreenState();
}

class _PlanForMeStepTwoScreenState
    extends State<PlanForMeStepTwoPlaceholderScreen> {
  static const _minimumPeople = 1;
  static const _maximumPeople = 100;

  late int _exactPeopleCount;
  PeopleRange? _selectedRange;

  @override
  void initState() {
    super.initState();
    _exactPeopleCount = widget.flowState.exactPeopleCount ?? 6;
    _selectedRange = widget.flowState.peopleRange;
  }

  void _changeExactCount(int change) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedRange = null;
      _exactPeopleCount =
          (_exactPeopleCount + change)
              .clamp(_minimumPeople, _maximumPeople)
              .toInt();
      widget.flowState.exactPeopleCount = _exactPeopleCount;
      widget.flowState.peopleRange = null;
    });
  }

  void _selectRange(PeopleRange range) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedRange = range;
      widget.flowState.peopleRange = range;
      widget.flowState.exactPeopleCount = null;
    });
  }

  void _continue() {
    widget.flowState.exactPeopleCount =
        _selectedRange == null ? _exactPeopleCount : null;
    widget.flowState.peopleRange = _selectedRange;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanForMeStepThreeScreen(
          flowState: widget.flowState,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayValue = _selectedRange?.label ?? '$_exactPeopleCount';

    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 2 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(completedSteps: 2),
                    const SizedBox(height: 34),
                    const Text(
                      'How many people\nare coming?',
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'No typing needed.',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 32),
                    _PeopleCounterPanel(
                      displayValue: displayValue,
                      canDecrease: _exactPeopleCount > _minimumPeople,
                      onDecrease: () => _changeExactCount(-1),
                      onIncrease: _exactPeopleCount < _maximumPeople
                          ? () => _changeExactCount(1)
                          : null,
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'OR PICK A RANGE',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 14,
                        letterSpacing: 1.1,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 9,
                      runSpacing: 10,
                      children: PeopleRange.values
                          .map(
                            (range) => _PeopleRangeChip(
                              range: range,
                              selected: _selectedRange == range,
                              onTap: () => _selectRange(range),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _continue,
                      style: FilledButton.styleFrom(
                        backgroundColor: FajiColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Continue',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      '← Go back',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PeopleCounterPanel extends StatelessWidget {
  const _PeopleCounterPanel({
    required this.displayValue,
    required this.canDecrease,
    required this.onDecrease,
    required this.onIncrease,
  });

  final String displayValue;
  final bool canDecrease;
  final VoidCallback onDecrease;
  final VoidCallback? onIncrease;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 132,
      padding: const EdgeInsets.symmetric(horizontal: 28),
      decoration: BoxDecoration(
        color: const Color(0xff2d0d0e),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _CounterButton(
            icon: Icons.remove,
            onTap: canDecrease ? onDecrease : null,
            primary: false,
          ),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: ScaleTransition(scale: animation, child: child),
                  ),
                  child: Text(
                    displayValue,
                    key: ValueKey(displayValue),
                    style: const TextStyle(
                      color: FajiColors.primary,
                      fontSize: 56,
                      height: .95,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'people',
                  style: TextStyle(
                    color: FajiColors.textSecondaryDark,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          _CounterButton(
            icon: Icons.add,
            onTap: onIncrease,
            primary: true,
          ),
        ],
      ),
    );
  }
}

class _CounterButton extends StatelessWidget {
  const _CounterButton({
    required this.icon,
    required this.onTap,
    required this.primary,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: primary ? FajiColors.primary : const Color(0xff181919),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 58,
          height: 58,
          child: Icon(
            icon,
            size: 29,
            color: onTap == null
                ? FajiColors.textSecondaryDark
                : Colors.white,
          ),
        ),
      ),
    );
  }
}

class _PeopleRangeChip extends StatelessWidget {
  const _PeopleRangeChip({
    required this.range,
    required this.selected,
    required this.onTap,
  });

  final PeopleRange range;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? FajiColors.primary : FajiColors.backgroundDark,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
            ),
          ),
          child: Text(
            range.label,
            style: TextStyle(
              color: selected ? Colors.white : FajiColors.textPrimaryDark,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class PlanForMeStepThreeScreen extends StatefulWidget {
  const PlanForMeStepThreeScreen({
    super.key,
    required this.flowState,
  });

  final PlanForMeFlowState flowState;

  @override
  State<PlanForMeStepThreeScreen> createState() =>
      _PlanForMeStepThreeScreenState();
}

class _PlanForMeStepThreeScreenState
    extends State<PlanForMeStepThreeScreen> {
  static const _predefinedLocations = [
    'Lekki',
    'Victoria Island',
    'Ikeja',
    'Yaba',
    'Surulere',
  ];

  late String? _selectedLocation;

  @override
  void initState() {
    super.initState();
    _selectedLocation = widget.flowState.selectedLocation;
  }

  void _selectPredefinedLocation(String location) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedLocation = location;
      widget.flowState.selectedLocation = location;
    });
  }

  Future<void> _chooseCustomLocation() async {
    HapticFeedback.lightImpact();
    final controller = TextEditingController();
    final customLocation = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: FajiColors.surfaceDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          22,
          20,
          MediaQuery.viewInsetsOf(sheetContext).bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Choose another location',
              style: TextStyle(
                color: FajiColors.textPrimaryDark,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              autofocus: true,
              textInputAction: TextInputAction.done,
              onSubmitted: (value) {
                final location = value.trim();
                if (location.isNotEmpty) {
                  Navigator.of(sheetContext).pop(location);
                }
              },
              style: const TextStyle(
                color: FajiColors.textPrimaryDark,
                fontSize: 17,
              ),
              decoration: InputDecoration(
                hintText: 'Search location...',
                hintStyle: const TextStyle(
                  color: FajiColors.textSecondaryDark,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: FajiColors.textSecondaryDark,
                ),
                filled: true,
                fillColor: FajiColors.backgroundDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton(
                onPressed: () {
                  final location = controller.text.trim();
                  if (location.isNotEmpty) {
                    Navigator.of(sheetContext).pop(location);
                  }
                },
                style: FilledButton.styleFrom(
                  backgroundColor: FajiColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Use Location',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
    controller.dispose();

    if (!mounted || customLocation == null) return;
    HapticFeedback.lightImpact();
    setState(() {
      _selectedLocation = customLocation;
      widget.flowState.selectedLocation = customLocation;
    });
  }

  void _continue() {
    final selectedLocation = _selectedLocation;
    if (selectedLocation == null || selectedLocation.isEmpty) return;

    widget.flowState.selectedLocation = selectedLocation;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanForMeStepFourScreen(
          flowState: widget.flowState,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 3 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(completedSteps: 3),
                    const SizedBox(height: 34),
                    const Text(
                      'Where do you\nwant to go?',
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Choose a place that works for you.',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 26),
                    for (final location in _predefinedLocations) ...[
                      _LocationCard(
                        label: location,
                        selected: _selectedLocation == location,
                        onTap: () => _selectPredefinedLocation(location),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_selectedLocation != null &&
                        !_predefinedLocations.contains(_selectedLocation)) ...[
                      _LocationCard(
                        label: _selectedLocation!,
                        selected: true,
                        onTap: () =>
                            _chooseCustomLocation(),
                      ),
                      const SizedBox(height: 12),
                    ],
                    _LocationCard(
                      label: 'Choose another location',
                      icon: Icons.search_rounded,
                      selected: false,
                      onTap: _chooseCustomLocation,
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _selectedLocation == null ? null : _continue,
                      style: FilledButton.styleFrom(
                        backgroundColor: FajiColors.primary,
                        disabledBackgroundColor: const Color(0xffffaaa9),
                        disabledForegroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Continue',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      '← Go back',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationCard extends StatelessWidget {
  const _LocationCard({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon = Icons.location_on_outlined,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xff292020) : FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: 19),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 22,
                color: selected
                    ? FajiColors.primary
                    : FajiColors.textSecondaryDark,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: FajiColors.textPrimaryDark,
                    fontSize: 17,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (selected)
                const Icon(
                  Icons.check_circle,
                  color: FajiColors.primary,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class PlanForMeStepFourScreen extends StatefulWidget {
  const PlanForMeStepFourScreen({
    super.key,
    required this.flowState,
  });

  final PlanForMeFlowState flowState;

  @override
  State<PlanForMeStepFourScreen> createState() =>
      _PlanForMeStepFourScreenState();
}

class _PlanForMeStepFourScreenState extends State<PlanForMeStepFourScreen> {
  PlanBudget? _selectedBudget;

  @override
  void initState() {
    super.initState();
    _selectedBudget = widget.flowState.selectedBudget;
  }

  void _selectBudget(PlanBudget budget) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedBudget = budget;
      widget.flowState.selectedBudget = budget;
    });
  }

  void _continue() {
    final budget = _selectedBudget;
    if (budget == null) return;

    widget.flowState.selectedBudget = budget;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanForMeStepFiveScreen(
          flowState: widget.flowState,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 4 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(completedSteps: 4),
                    const SizedBox(height: 34),
                    const Text(
                      'What feels\ncomfortable?',
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "We'll find options around your range.",
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 26),
                    for (final budget in PlanBudget.values) ...[
                      _BudgetCard(
                        budget: budget,
                        selected: _selectedBudget == budget,
                        onTap: () => _selectBudget(budget),
                      ),
                      if (budget != PlanBudget.values.last)
                        const SizedBox(height: 12),
                    ],
                    const SizedBox(height: 14),
                    const Center(
                      child: Text(
                        'Your budget is a preference, not a hard limit.',
                        style: TextStyle(
                          color: FajiColors.textSecondaryDark,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _selectedBudget == null ? null : _continue,
                      style: FilledButton.styleFrom(
                        backgroundColor: FajiColors.primary,
                        disabledBackgroundColor: const Color(0xffffaaa9),
                        disabledForegroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Continue',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      '← Go back',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  const _BudgetCard({
    required this.budget,
    required this.selected,
    required this.onTap,
  });

  final PlanBudget budget;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xff292020) : FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 76,
          padding: const EdgeInsets.symmetric(horizontal: 21),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      budget.label,
                      style: const TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      budget.description,
                      style: const TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Icon(
                  Icons.check_circle,
                  color: FajiColors.primary,
                  size: 21,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class PlanForMeStepFiveScreen extends StatefulWidget {
  const PlanForMeStepFiveScreen({
    super.key,
    required this.flowState,
  });

  final PlanForMeFlowState flowState;

  @override
  State<PlanForMeStepFiveScreen> createState() =>
      _PlanForMeStepFiveScreenState();
}

class _PlanForMeStepFiveScreenState extends State<PlanForMeStepFiveScreen> {
  PlanDateOption? _selectedDateOption;
  DateTime? _selectedDate;
  PlanTimeOfDay? _selectedTimeOfDay;

  @override
  void initState() {
    super.initState();
    _selectedDateOption = widget.flowState.selectedDateOption;
    _selectedDate = widget.flowState.selectedDate;
    _selectedTimeOfDay = widget.flowState.selectedTimeOfDay;
  }

  DateTime _dateOnly(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  DateTime _weekendDate() {
    final today = _dateOnly(DateTime.now());
    final daysUntilSaturday = (DateTime.saturday - today.weekday + 7) % 7;
    return today.add(Duration(days: daysUntilSaturday));
  }

  void _selectDate(PlanDateOption option, DateTime date) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedDateOption = option;
      _selectedDate = _dateOnly(date);
      widget.flowState.selectedDateOption = option;
      widget.flowState.selectedDate = _selectedDate;
    });
  }

  Future<void> _chooseCustomDate() async {
    final now = _dateOnly(DateTime.now());
    final pickedDate = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: DateTime(now.year + 2, 12, 31),
      initialDate: _selectedDate != null && !_selectedDate!.isBefore(now)
          ? _selectedDate!
          : now,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: FajiColors.primary,
            surface: FajiColors.surfaceDark,
          ),
          dialogTheme: const DialogThemeData(
            backgroundColor: FajiColors.surfaceDark,
          ),
        ),
        child: child!,
      ),
    );
    if (!mounted || pickedDate == null) return;
    _selectDate(PlanDateOption.custom, pickedDate);
  }

  void _selectTime(PlanTimeOfDay time) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedTimeOfDay = time;
      widget.flowState.selectedTimeOfDay = time;
      widget.flowState.selectedTimeRange = time.range;
    });
  }

  void _continue() {
    if (_selectedDate == null || _selectedTimeOfDay == null) return;
    widget.flowState.selectedDate = _selectedDate;
    widget.flowState.selectedDateOption = _selectedDateOption;
    widget.flowState.selectedTimeOfDay = _selectedTimeOfDay;
    widget.flowState.selectedTimeRange = _selectedTimeOfDay!.range;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanForMeStepSixScreen(
          flowState: widget.flowState,
        ),
      ),
    );
  }

  String _dateLabel() {
    if (_selectedDate == null) return '📅 Choose a date';
    if (_selectedDateOption == PlanDateOption.custom) {
      return '📅 ${_formatDate(_selectedDate!)}';
    }
    return '📅 Choose a date';
  }

  @override
  Widget build(BuildContext context) {
    final today = _dateOnly(DateTime.now());
    final tomorrow = today.add(const Duration(days: 1));
    final dateSelected = _selectedDate != null;

    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 5 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(completedSteps: 5),
                    const SizedBox(height: 34),
                    const Text(
                      'When are\nyou going?',
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Pick a date and time.',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 27),
                    const _SectionLabel(label: 'DATE'),
                    const SizedBox(height: 13),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 2.7,
                      children: [
                        _DateOptionCard(
                          label: 'Today',
                          selected: _selectedDateOption ==
                              PlanDateOption.today,
                          onTap: () => _selectDate(PlanDateOption.today, today),
                        ),
                        _DateOptionCard(
                          label: 'Tomorrow',
                          selected: _selectedDateOption ==
                              PlanDateOption.tomorrow,
                          onTap: () =>
                              _selectDate(PlanDateOption.tomorrow, tomorrow),
                        ),
                        _DateOptionCard(
                          label: 'This Weekend',
                          selected: _selectedDateOption ==
                              PlanDateOption.weekend,
                          onTap: () => _selectDate(
                            PlanDateOption.weekend,
                            _weekendDate(),
                          ),
                        ),
                        _DateOptionCard(
                          label: _dateLabel(),
                          selected: _selectedDateOption ==
                              PlanDateOption.custom,
                          onTap: _chooseCustomDate,
                        ),
                      ],
                    ),
                    const SizedBox(height: 27),
                    const _SectionLabel(label: 'TIME OF DAY'),
                    const SizedBox(height: 13),
                    _TimeSelector(
                      selectedTime: _selectedTimeOfDay,
                      onSelected: _selectTime,
                    ),
                    if (_selectedTimeOfDay != null) ...[
                      const SizedBox(height: 16),
                      _TimeRangeCard(time: _selectedTimeOfDay!),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: dateSelected && _selectedTimeOfDay != null
                          ? _continue
                          : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: FajiColors.primary,
                        disabledBackgroundColor: const Color(0xffffaaa9),
                        disabledForegroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Continue',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      '← Go back',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Text(
        label,
        style: const TextStyle(
          color: FajiColors.textSecondaryDark,
          fontSize: 14,
          letterSpacing: 1.1,
          fontWeight: FontWeight.w500,
        ),
      );
}

class _DateOptionCard extends StatelessWidget {
  const _DateOptionCard({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? FajiColors.primary : FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? Colors.white : FajiColors.textPrimaryDark,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _TimeSelector extends StatelessWidget {
  const _TimeSelector({required this.selectedTime, required this.onSelected});

  final PlanTimeOfDay? selectedTime;
  final ValueChanged<PlanTimeOfDay> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      decoration: BoxDecoration(
        color: FajiColors.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: FajiColors.borderDark),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: PlanTimeOfDay.values.map((time) {
          final selected = selectedTime == time;
          return Expanded(
            child: Material(
              color: selected ? FajiColors.primary : Colors.transparent,
              child: InkWell(
                onTap: () => onSelected(time),
                child: Container(
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    border: Border(
                      right: time == PlanTimeOfDay.night
                          ? BorderSide.none
                          : const BorderSide(color: FajiColors.borderDark),
                    ),
                  ),
                  child: Text(
                    time.label,
                    style: TextStyle(
                      color: selected
                          ? Colors.white
                          : FajiColors.textPrimaryDark,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _TimeRangeCard extends StatelessWidget {
  const _TimeRangeCard({required this.time});

  final PlanTimeOfDay time;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 52,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xff2d0d0e),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        '${time.icon}  ${time.range}',
        style: const TextStyle(
          color: FajiColors.primary,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

String _formatDate(DateTime date) {
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
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}

class PlanForMeStepSixScreen extends StatefulWidget {
  const PlanForMeStepSixScreen({
    super.key,
    required this.flowState,
  });

  final PlanForMeFlowState flowState;

  @override
  State<PlanForMeStepSixScreen> createState() => _PlanForMeStepSixScreenState();
}

class _PlanForMeStepSixScreenState extends State<PlanForMeStepSixScreen> {
  late final Set<PlanVibe> _selectedVibes;

  @override
  void initState() {
    super.initState();
    _selectedVibes = {...widget.flowState.selectedVibes};
  }

  void _toggleVibe(PlanVibe vibe) {
    HapticFeedback.lightImpact();
    setState(() {
      if (!_selectedVibes.add(vibe)) {
        _selectedVibes.remove(vibe);
      }
      widget.flowState.selectedVibes = {..._selectedVibes};
    });
  }

  void _showPlans() {
    if (_selectedVibes.isEmpty) return;
    widget.flowState.selectedVibes = {..._selectedVibes};
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlanResultsScreen(flowState: widget.flowState),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(26, 22, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _BackButton(onTap: () => Navigator.of(context).pop()),
                        const SizedBox(width: 13),
                        const Text(
                          'Step 6 of 6',
                          style: TextStyle(
                            color: FajiColors.textSecondaryDark,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const _ProgressIndicator(completedSteps: 6),
                    const SizedBox(height: 34),
                    const Text(
                      "What's the vibe?",
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Pick what you're feeling. Choose as many as you like.",
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 27),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: PlanVibe.values.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisExtent: 112,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                      itemBuilder: (context, index) {
                        final vibe = PlanVibe.values[index];
                        return _VibeCard(
                          vibe: vibe,
                          selected: _selectedVibes.contains(vibe),
                          onTap: () => _toggleVibe(vibe),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xff202020))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _selectedVibes.isEmpty ? null : _showPlans,
                      style: FilledButton.styleFrom(
                        backgroundColor: FajiColors.primary,
                        disabledBackgroundColor: const Color(0xffffaaa9),
                        disabledForegroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Show My Plans →',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      '← Go back',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VibeCard extends StatelessWidget {
  const _VibeCard({
    required this.vibe,
    required this.selected,
    required this.onTap,
  });

  final PlanVibe vibe;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: selected ? const Color(0xff292020) : FajiColors.surfaceDark,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(
          color: selected ? FajiColors.primary : FajiColors.borderDark,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(17),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(17),
          child: Stack(
            children: [
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(vibe.emoji, style: const TextStyle(fontSize: 33)),
                    const SizedBox(height: 8),
                    Text(
                      vibe.label,
                      style: const TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Positioned(
                  top: 9,
                  right: 10,
                  child: Icon(
                    Icons.check_circle,
                    color: FajiColors.primary,
                    size: 20,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegacyPlanResultsScreen extends StatelessWidget {
  const _LegacyPlanResultsScreen({super.key, required this.flowState});

  final PlanForMeFlowState flowState;

  @override
  Widget build(BuildContext context) {
    final vibes = flowState.selectedVibes.map((vibe) => vibe.label).join(', ');
    final people = flowState.peopleRange?.label ??
        '${flowState.exactPeopleCount ?? 6} people';
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: FajiColors.backgroundDark,
        title: const Text('Your Faji Plans'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Your plans are being prepared\n\n'
            'Plan: ${flowState.planType?.label}\n'
            'People: $people\n'
            'Location: ${flowState.selectedLocation}\n'
            'Budget: ${flowState.selectedBudget?.label}\n'
            'Date: ${flowState.selectedDate}\n'
            'Time: ${flowState.selectedTimeRange}\n'
            'Vibes: $vibes',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              height: 1.45,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
