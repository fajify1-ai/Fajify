import '../../../../core/widgets/service_unavailable_view.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../home/data/models/home_business.dart';
import '../../../home/data/repositories/home_business_repository.dart';
import '../../../home/presentation/widgets/home_filter_sheet.dart';
import '../../../home/presentation/widgets/home_category_filter.dart';
import '../../../home/presentation/widgets/home_header.dart';
import '../../../home/presentation/widgets/home_search_bar.dart';
import '../../../home/presentation/widgets/promo_banner_carousel.dart';
import '../../../home/data/models/whats_on_item.dart';
import '../../../home/presentation/widgets/whats_on_section.dart';
import '../../../home/presentation/widgets/venue_card.dart';
import '../../../home/presentation/screens/temporary_home_destinations.dart';
import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../../home/presentation/widgets/floating_home_nav.dart';
import '../../../wishlist/data/repositories/wishlist_repository.dart';

class UserHomeScreen extends StatefulWidget {
  const UserHomeScreen({super.key, this.repository});
  final CustomerDiscoveryRepository? repository;

  @override
  State<UserHomeScreen> createState() => _UserHomeScreenState();
}

class _UserHomeScreenState extends State<UserHomeScreen> {
  late final CustomerDiscoveryRepository _repository =
      widget.repository ?? HomeBusinessRepository();
  final _searchController = TextEditingController();

  List<HomeBusiness> _businesses = const [];
  String _query = '';
  Set<String> _locations = <String>{};
  Set<String> _budgets = <String>{};
  String _rating = 'Any';
  String _category = 'All';
  bool _loading = true;
  bool _unavailable = false;

  @override
  void initState() {
    super.initState();
    WishlistRepository.instance.loadForCurrentUser();
    _loadBusinesses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBusinesses() async {
    List<HomeBusiness> businesses;
    try {
      businesses = await _repository.loadHomeBusinesses();
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _unavailable = true;
        });
      }
      return;
    }
    if (!mounted) return;
    setState(() {
      _businesses = businesses;
      _loading = false;
    });
  }

  List<HomeBusiness> get _results {
    final normalizedQuery = _query.trim().toLowerCase();
    return _businesses.where((business) {
      final matchesQuery =
          normalizedQuery.isEmpty ||
          business.businessName.toLowerCase().contains(normalizedQuery);
      final matchesLocation =
          _locations.isEmpty ||
          _locations.any(
            (location) =>
                business.location.toLowerCase() == location.toLowerCase(),
          );
      final matchesBudget =
          _budgets.isEmpty ||
          _budgets.any((budget) => _matchesBudget(business.priceMin, budget));
      final matchesRating =
          _rating == 'Any' || business.rating >= _ratingThreshold(_rating);
      final matchesCategory =
          _category == 'All' ||
          business.categories.any(
            (value) => value.toLowerCase() == _category.toLowerCase(),
          );
      return matchesQuery &&
          matchesCategory &&
          matchesLocation &&
          matchesBudget &&
          matchesRating;
    }).toList();
  }

  bool _matchesBudget(int price, String budget) {
    switch (budget) {
      case 'Under ₦10K':
        return price < 10000;
      case '₦10K–₦30K':
        return price >= 10000 && price <= 30000;
      case '₦30K–₦60K':
        return price > 30000 && price <= 60000;
      case '₦60K–₦100K':
        return price > 60000 && price <= 100000;
      case '₦100K+':
        return price > 100000;
      default:
        return true;
    }
  }

  double _ratingThreshold(String rating) {
    if (rating.contains('4.5')) return 4.5;
    if (rating.contains('4.0')) return 4.0;
    if (rating.contains('3.5')) return 3.5;
    return 0;
  }

  bool get _filtersActive =>
      _locations.isNotEmpty || _budgets.isNotEmpty || _rating != 'Any';

  void _updateFilters(
    Set<String> locations,
    Set<String> budgets,
    String rating,
  ) {
    setState(() {
      _locations = locations;
      _budgets = budgets;
      _rating = rating;
    });
  }

  void _clearFilters() {
    setState(() {
      _locations = <String>{};
      _budgets = <String>{};
      _rating = 'Any';
    });
  }

  void _openFilters() {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: FajiColors.surfaceDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
      ),
      builder: (_) => HomeFilterSheet(
        locations: _locations,
        budgets: _budgets,
        rating: _rating,
        onChanged: _updateFilters,
        onClear: _clearFilters,
        onApply: () => Navigator.of(context).pop(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: WishlistRepository.instance,
      builder: (context, _) {
        final results = _results;
        final wishlist = WishlistRepository.instance;
        return Scaffold(
          backgroundColor: FajiColors.backgroundDark,
          body: Stack(
            children: [
              SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      color: FajiColors.backgroundDark,
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const HomeHeader(),
                          const SizedBox(height: 18),
                          HomeSearchBar(
                            controller: _searchController,
                            onChanged: (value) =>
                                setState(() => _query = value),
                            onFilter: _openFilters,
                            filterActive: _filtersActive,
                          ),
                          const SizedBox(height: 14),
                          const PromoBannerCarousel(),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 170),
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        children: [
                          if (_unavailable)
                            const ServiceUnavailableView(feature: 'Events')
                          else
                            WhatsOnSection(
                              savedIds: wishlist.savedIds,
                              onSaved: (item) =>
                                  _showMessage(wishlist.loadError),
                              onCtaPressed: (item) => _showWhatsOnMessage(item),
                              onSeeAll: () => _showMessage(
                                'All events and offers coming next',
                              ),
                            ),
                          const SizedBox(height: 18),
                          HomeCategoryFilter(
                            selectedCategory: _category,
                            onSelected: (value) =>
                                setState(() => _category = value),
                          ),
                          const SizedBox(height: 18),
                          if (_loading)
                            const SizedBox(
                              height: 220,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: FajiColors.primary,
                                ),
                              ),
                            )
                          else if (_unavailable)
                            const ServiceUnavailableView(feature: 'Discovery')
                          else if (results.isEmpty)
                            _EmptySearchState(
                              query: _query,
                              category: _category,
                              filtersActive: _filtersActive,
                              onClear: _clearFilters,
                            )
                          else
                            for (
                              var index = 0;
                              index < results.length;
                              index++
                            ) ...[
                              VenueCard(
                                business: results[index],
                                saved: wishlist.isSaved(
                                  'venue_${results[index].id}',
                                ),
                                onSaved: (_) =>
                                    _showMessage(wishlist.loadError),
                                onBook: () => _showMessage(
                                  'Booking details coming next for ${results[index].businessName}.',
                                ),
                              ),
                              if (index < results.length - 1)
                                const SizedBox(height: 10),
                            ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: FloatingHomeNav(
                  currentItem: HomeNavItem.home,
                  onNavigation: (item) {
                    switch (item) {
                      case HomeNavItem.home:
                        break;
                      case HomeNavItem.wishlist:
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => const WishlistScreen(),
                          ),
                        );
                      case HomeNavItem.bookings:
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => const BookingsScreen(),
                          ),
                        );
                      case HomeNavItem.profile:
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => const ProfileScreen(),
                          ),
                        );
                    }
                  },
                  onPlanForMe: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const PlanForMeStepOneScreen(),
                    ),
                  ),
                  onBrowsePlans: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const BrowsePlansScreen(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showWhatsOnMessage(WhatsOnItem item) {
    _showMessage('${item.ctaText} details coming next.');
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: FajiColors.surfaceDark,
      ),
    );
  }
}

class _EmptySearchState extends StatelessWidget {
  const _EmptySearchState({
    required this.query,
    required this.category,
    required this.filtersActive,
    required this.onClear,
  });

  final String query;
  final String category;
  final bool filtersActive;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.search_off_rounded,
            size: 42,
            color: FajiColors.textSecondaryDark,
          ),
          const SizedBox(height: 12),
          Text(
            category != 'All' && query.trim().isEmpty
                ? 'No places available in this category yet.'
                : query.trim().isEmpty
                ? 'No places match your search and filters.'
                : 'No places found for “${query.trim()}”',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (filtersActive) ...[
            const SizedBox(height: 14),
            TextButton(
              onPressed: onClear,
              child: const Text(
                'Clear filters',
                style: TextStyle(color: FajiColors.primary, fontSize: 15),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
