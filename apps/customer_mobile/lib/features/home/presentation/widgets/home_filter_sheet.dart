import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

const homeLocations = [
  'Lekki',
  'Victoria Island',
  'Ikeja',
  'Ikoyi',
  'Yaba',
  'Surulere',
];

const homeBudgets = [
  'Under ₦10K',
  '₦10K–₦30K',
  '₦30K–₦60K',
  '₦60K–₦100K',
  '₦100K+',
];

const homeRatings = ['★ 4.5+', '★ 4.0+', '★ 3.5+', 'Any'];

class HomeFilterSheet extends StatefulWidget {
  const HomeFilterSheet({
    super.key,
    required this.locations,
    required this.budgets,
    required this.rating,
    required this.onChanged,
    required this.onClear,
    required this.onApply,
  });

  final Set<String> locations;
  final Set<String> budgets;
  final String rating;
  final void Function(Set<String> locations, Set<String> budgets, String rating)
  onChanged;
  final VoidCallback onClear;
  final VoidCallback onApply;

  @override
  State<HomeFilterSheet> createState() => _HomeFilterSheetState();
}

class _HomeFilterSheetState extends State<HomeFilterSheet> {
  late Set<String> locations = {...widget.locations};
  late Set<String> budgets = {...widget.budgets};
  late String rating = widget.rating;

  void _changed() {
    setState(() {});
    widget.onChanged({...locations}, {...budgets}, rating);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Filter',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      locations.clear();
                      budgets.clear();
                      rating = 'Any';
                      _changed();
                      widget.onClear();
                    },
                    child: const Text(
                      'Clear all',
                      style: TextStyle(
                        color: FajiColors.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _label('LOCATION'),
              _multiChoice(homeLocations, locations, (value) {
                locations.contains(value)
                    ? locations.remove(value)
                    : locations.add(value);
                _changed();
              }),
              const SizedBox(height: 17),
              _label('BUDGET'),
              _multiChoice(homeBudgets, budgets, (value) {
                budgets.contains(value)
                    ? budgets.remove(value)
                    : budgets.add(value);
                _changed();
              }),
              const SizedBox(height: 17),
              _label('RATING'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: homeRatings
                    .map(
                      (value) => _ChoicePill(
                        label: value,
                        selected: rating == value,
                        onTap: () {
                          rating = value;
                          _changed();
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: widget.onApply,
                  style: FilledButton.styleFrom(
                    backgroundColor: FajiColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(11),
                    ),
                  ),
                  child: const Text(
                    'Apply Filters',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 9),
    child: Text(
      text,
      style: const TextStyle(
        color: FajiColors.textSecondaryDark,
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: .7,
      ),
    ),
  );

  Widget _multiChoice(
    List<String> values,
    Set<String> selected,
    ValueChanged<String> onTap,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: values
          .map(
            (value) => _ChoicePill(
              label: value,
              selected: selected.contains(value),
              onTap: () => onTap(value),
            ),
          )
          .toList(),
    );
  }
}

class _ChoicePill extends StatelessWidget {
  const _ChoicePill({
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
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? FajiColors.primary : FajiColors.borderDark,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : FajiColors.textSecondaryDark,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
