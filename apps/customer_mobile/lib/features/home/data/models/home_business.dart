import 'package:flutter/foundation.dart';

@immutable
class HomeBusiness {
  const HomeBusiness({
    required this.id,
    required this.businessName,
    required this.category,
    required this.location,
    required this.priceMin,
    required this.rating,
    this.categories = const [],
    this.address = '',
    this.imageUrl = '',
    this.priceMax,
    this.isOpen = true,
    this.isActive = true,
    this.isApproved = true,
    this.isPlaceholder = false,
  });

  final String id;
  final String businessName;
  final String category;
  final String location;
  final List<String> categories;
  final String address;
  final String imageUrl;
  final int priceMin;
  final int? priceMax;
  final double rating;
  final bool isOpen;
  final bool isActive;
  final bool isApproved;
  final bool isPlaceholder;

  factory HomeBusiness.fromFirestore(String id, Map<String, dynamic> data) {
    final price = data['priceMin'];
    final rating = data['rating'];
    final rawCategories = data['categories'];
    final categories = rawCategories is List
        ? rawCategories
              .whereType<String>()
              .map((value) => value.trim())
              .where((value) => value.isNotEmpty)
              .toList()
        : <String>[];
    final primaryCategory = _string(data['category'], 'Other');
    return HomeBusiness(
      id: id,
      businessName: _string(data['businessName'], 'Unnamed business'),
      category: primaryCategory,
      categories: categories.isEmpty ? [primaryCategory] : categories,
      location: _string(data['location'], 'Lagos'),
      address: _string(data['address'], ''),
      imageUrl: _string(data['imageUrl'], ''),
      priceMin: price is num ? price.round() : 0,
      priceMax: data['priceMax'] is num
          ? (data['priceMax'] as num).round()
          : null,
      rating: rating is num ? rating.toDouble() : 0,
      isOpen: data['isOpen'] is bool ? data['isOpen'] as bool : true,
      isActive: data['isActive'] is bool ? data['isActive'] as bool : false,
      isApproved: data['isApproved'] is bool
          ? data['isApproved'] as bool
          : false,
    );
  }
}

String _string(Object? value, String fallback) =>
    value is String && value.trim().isNotEmpty ? value.trim() : fallback;

const placeholderBusinesses = [
  HomeBusiness(
    id: 'placeholder_shiro',
    businessName: 'Shiro Lagos',
    category: 'Restaurant',
    categories: ['Restaurant'],
    imageUrl: 'assets/home_images/photo-1517248135467-4c7edcad34c4.jpg',
    location: 'Victoria Island',
    priceMin: 25000,
    rating: 4.8,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_landmark',
    businessName: 'Landmark Beach',
    category: 'Beach',
    categories: ['Beach'],
    imageUrl: 'assets/home_images/photo-1507525428034-b723cf961d3e.jpg',
    location: 'Lekki',
    priceMin: 5000,
    rating: 4.9,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_filmhouse',
    businessName: 'Filmhouse Cinemas',
    category: 'Cinema',
    categories: ['Cinema'],
    imageUrl: 'assets/home_images/photo-1489599849927-2ee91cede3ba.jpg',
    location: 'Lekki',
    priceMin: 3500,
    rating: 4.6,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_muri',
    businessName: 'Muri Okunola Park',
    category: 'Park',
    categories: ['Park', 'Outdoor'],
    imageUrl: 'assets/home_images/photo-1558030006-450675393462.jpg',
    location: 'Victoria Island',
    priceMin: 0,
    rating: 4.5,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_nok',
    businessName: 'Nok by Alara',
    category: 'Restaurant',
    categories: ['Restaurant'],
    imageUrl: 'assets/home_images/photo-1533777324565-a040eb52facd.jpg',
    location: 'Ikoyi',
    priceMin: 30000,
    rating: 4.9,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_hardrock',
    businessName: 'Hard Rock Cafe',
    category: 'Bar',
    categories: ['Bar'],
    imageUrl: 'assets/home_images/photo-1514362545857-3bc16c4c7d1b.jpg',
    location: 'Oniru Estate',
    priceMin: 15000,
    rating: 4.6,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_silverbird',
    businessName: 'Silverbird Cinemas',
    category: 'Cinema',
    categories: ['Cinema'],
    imageUrl: 'assets/home_images/photo-1517604931442-7e0c8ed2963c.jpg',
    location: 'Victoria Island',
    priceMin: 3000,
    rating: 4.5,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_ilashe',
    businessName: 'Ilashe Beach Resort',
    category: 'Beach',
    categories: ['Beach'],
    imageUrl: 'assets/home_images/photo-1542314831-068cd1dbfeeb.jpg',
    location: 'Lagos Island',
    priceMin: 45000,
    rating: 4.9,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_island',
    businessName: 'The Island Club',
    category: 'Club',
    categories: ['Club'],
    imageUrl: 'assets/home_images/photo-1513456852971-30c0b8199d4d.jpg',
    location: 'Ikoyi',
    priceMin: 60000,
    rating: 4.8,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_skybar',
    businessName: 'Sky Bar Lagos',
    category: 'Bar',
    categories: ['Bar'],
    imageUrl: 'assets/home_images/photo-1533777324565-a040eb52facd.jpg',
    location: 'Victoria Island',
    priceMin: 20000,
    rating: 4.7,
    isPlaceholder: true,
  ),
  HomeBusiness(
    id: 'placeholder_dominos',
    businessName: "Domino's Pizza",
    category: 'Restaurant',
    categories: ['Restaurant'],
    imageUrl: 'assets/home_images/photo-1513104890138-7c749659a591.jpg',
    location: 'Surulere',
    priceMin: 2000,
    rating: 4.8,
    isPlaceholder: true,
  ),
];
