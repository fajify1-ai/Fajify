import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../data/models/plan_option.dart';

class PlanRecommendationResult {
  const PlanRecommendationResult({
    required this.bestMatch,
    required this.spendLess,
    required this.worthStretching,
    required this.moreOptions,
  });

  final PlanOption? bestMatch;
  final PlanOption? spendLess;
  final PlanOption? worthStretching;
  final List<PlanOption> moreOptions;
}

class PlanRecommendationService {
  PlanRecommendationResult recommend(
    PlanForMeFlowState state,
    List<PlanOption> plans,
  ) {
    final eligible = plans.where((plan) => _isEligible(plan, state)).toList();
    final source = eligible.isEmpty
        ? plans.where((plan) => _isEligibleSoftly(plan, state)).toList()
        : eligible;
    final ranked = source
      ..sort((a, b) => _score(b, state).compareTo(_score(a, state)));
    if (ranked.isEmpty) {
      return const PlanRecommendationResult(
        bestMatch: null,
        spendLess: null,
        worthStretching: null,
        moreOptions: [],
      );
    }

    final best = ranked.first;
    final used = <String>{best.id};
    final less = _findSpendLess(ranked, state, used);
    if (less != null) used.add(less.id);
    final stretch = _findStretch(ranked, state, used);
    if (stretch != null) used.add(stretch.id);
    final more = ranked.where((plan) => !used.contains(plan.id)).toList();
    return PlanRecommendationResult(
      bestMatch: best,
      spendLess: less,
      worthStretching: stretch,
      moreOptions: more,
    );
  }

  bool _isEligible(PlanOption plan, PlanForMeFlowState state) =>
      plan.isActive &&
      plan.isApproved &&
      _supportsCapacity(plan, state) &&
      (state.selectedTimeOfDay == null ||
          plan.supportedTimes.contains(state.selectedTimeOfDay));

  bool _isEligibleSoftly(PlanOption plan, PlanForMeFlowState state) =>
      plan.isActive && _supportsCapacity(plan, state);

  bool _supportsCapacity(PlanOption plan, PlanForMeFlowState state) {
    final requestedCount = state.exactPeopleCount ?? _rangeMinimum(state);
    return requestedCount >= plan.minimumGuests &&
        requestedCount <= plan.maximumGuests;
  }

  int _score(PlanOption plan, PlanForMeFlowState state) {
    var score = 0;
    final planType = state.planType;
    if (planType != null && plan.planTypes.contains(planType)) score += 25;
    if (state.selectedLocation != null &&
        plan.location.toLowerCase() == state.selectedLocation!.toLowerCase()) {
      score += 25;
    }
    final requestedCount = state.exactPeopleCount ?? _rangeMinimum(state);
    if (requestedCount >= plan.minimumGuests &&
        requestedCount <= plan.maximumGuests) {
      score += 15;
    }
    final budget = state.selectedBudget;
    if (budget == null || budget == PlanBudget.notSure) {
      score += 8;
    } else if (_priceMatches(plan, budget)) {
      score += 20;
    }
    final time = state.selectedTimeOfDay;
    if (time == null || plan.supportedTimes.contains(time)) score += 15;
    final date = state.selectedDate;
    if (date == null || plan.availableWeekdays.contains(date.weekday)) {
      score += 10;
    }
    for (final vibe in state.selectedVibes) {
      if (plan.vibes.contains(vibe)) score += 8;
    }
    return score + (plan.rating * 2).round();
  }

  int _rangeMinimum(PlanForMeFlowState state) {
    switch (state.peopleRange) {
      case PeopleRange.oneToTwo:
        return 1;
      case PeopleRange.threeToFive:
        return 3;
      case PeopleRange.sixToTen:
        return 6;
      case PeopleRange.elevenToTwenty:
        return 11;
      case PeopleRange.twentyPlus:
        return 20;
      case null:
        return 1;
    }
  }

  bool _priceMatches(PlanOption plan, PlanBudget budget) {
    final min = budget.min;
    final max = budget.max;
    if (min == null || max == null) return min == null || plan.priceMax >= min;
    return plan.priceMax >= min && plan.priceMin <= max;
  }

  PlanOption? _findSpendLess(
    List<PlanOption> ranked,
    PlanForMeFlowState state,
    Set<String> used,
  ) {
    final min = state.selectedBudget?.min;
    return ranked.cast<PlanOption?>().firstWhere(
      (plan) =>
          plan != null &&
          !used.contains(plan.id) &&
          min != null &&
          plan.priceMax < min,
      orElse: () => null,
    );
  }

  PlanOption? _findStretch(
    List<PlanOption> ranked,
    PlanForMeFlowState state,
    Set<String> used,
  ) {
    final max = state.selectedBudget?.max;
    if (max == null) return null;
    final limit = max * 1.3;
    return ranked.cast<PlanOption?>().firstWhere(
      (plan) =>
          plan != null &&
          !used.contains(plan.id) &&
          plan.priceMin > max &&
          plan.priceMin <= limit,
      orElse: () => null,
    );
  }
}
