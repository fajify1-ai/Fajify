import 'package:flutter/foundation.dart';

import '../../../home/data/models/home_business.dart';
import '../../../home/data/models/whats_on_item.dart';
import '../../../plans/data/models/plan_option.dart';

enum WishlistSourceType { venue, event, plan, business }

@immutable
class WishlistItem {
  const WishlistItem({
    required this.id,
    required this.sourceId,
    required this.sourceType,
    required this.title,
    required this.imageUrl,
    required this.category,
    required this.location,
    required this.price,
    required this.rating,
    required this.isPlaceholder,
    required this.createdAt,
    this.businessId = '',
    this.planId = '',
  });

  final String id;
  final String sourceId;
  final WishlistSourceType sourceType;
  final String businessId;
  final String planId;
  final String title;
  final String imageUrl;
  final String category;
  final String location;
  final int? price;
  final double? rating;
  final bool isPlaceholder;
  final DateTime createdAt;

  factory WishlistItem.fromBusiness(HomeBusiness business) => WishlistItem(
    id: 'venue_${business.id}',
    sourceId: business.id,
    sourceType: WishlistSourceType.venue,
    businessId: business.id,
    title: business.businessName,
    imageUrl: business.imageUrl,
    category: business.category,
    location: business.location,
    price: business.priceMin,
    rating: business.rating,
    isPlaceholder: business.isPlaceholder,
    createdAt: DateTime.now(),
  );

  factory WishlistItem.fromWhatsOn(WhatsOnItem item) => WishlistItem(
    id: 'event_${item.id}',
    sourceId: item.id,
    sourceType: WishlistSourceType.event,
    title: item.title,
    imageUrl: item.image,
    category: item.category,
    location: item.subtitle,
    price: null,
    rating: null,
    isPlaceholder: true,
    createdAt: DateTime.now(),
  );

  factory WishlistItem.fromPlan(PlanOption plan) => WishlistItem(
    id: 'plan_${plan.id}',
    sourceId: plan.id,
    sourceType: WishlistSourceType.plan,
    businessId: plan.businessId,
    planId: plan.id,
    title: plan.title,
    imageUrl: plan.imageUrl.isNotEmpty ? plan.imageUrl : plan.imageAsset,
    category: plan.planTypes.isEmpty ? 'Plan' : plan.planTypes.first.label,
    location: plan.location,
    price: plan.priceMin,
    rating: plan.rating,
    isPlaceholder: plan.isPlaceholder,
    createdAt: DateTime.now(),
  );
}
