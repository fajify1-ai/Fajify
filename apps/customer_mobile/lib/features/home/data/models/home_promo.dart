import 'package:flutter/foundation.dart';

@immutable
class HomePromo {
  const HomePromo({
    required this.id,
    required this.imagePath,
    required this.eyebrow,
    required this.title,
    required this.ctaText,
  });

  final String id;
  final String imagePath;
  final String eyebrow;
  final String title;
  final String ctaText;
}

const homePromos = [
  HomePromo(
    id: 'rooftops',
    imagePath: 'assets/home_images/photo-1565299507177-b0ac66763828.jpg',
    eyebrow: '12 ROOFTOPS AVAILABLE',
    title: 'Book a table with the\nbest city views',
    ctaText: 'Browse Rooftops',
  ),
  HomePromo(
    id: 'weekend-dining',
    imagePath: 'assets/home_images/photo-1517248135467-4c7edcad34c4.jpg',
    eyebrow: 'WEEKEND DINING',
    title: 'Discover new restaurants\naround Lagos',
    ctaText: 'Explore Dining',
  ),
  HomePromo(
    id: 'beach-escapes',
    imagePath: 'assets/home_images/photo-1507525428034-b723cf961d3e.jpg',
    eyebrow: 'BEACH ESCAPES',
    title: 'Find your next\nweekend getaway',
    ctaText: 'Explore Beaches',
  ),
  HomePromo(
    id: 'movie-night',
    imagePath: 'assets/home_images/photo-1489599849927-2ee91cede3ba.jpg',
    eyebrow: 'MOVIE NIGHT',
    title: 'Find cinemas and\nshowtimes near you',
    ctaText: 'Browse Cinemas',
  ),
];
