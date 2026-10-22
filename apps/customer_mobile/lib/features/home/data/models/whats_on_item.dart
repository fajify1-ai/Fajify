import 'package:flutter/foundation.dart';

@immutable
class WhatsOnItem {
  const WhatsOnItem({
    required this.id,
    required this.title,
    required this.category,
    required this.promoText,
    required this.subtitle,
    required this.image,
    required this.ctaText,
  });

  final String id;
  final String title;
  final String category;
  final String promoText;
  final String subtitle;
  final String image;
  final String ctaText;
}

const whatsOnItems = [
  WhatsOnItem(
    id: 'whats-on-deadpool',
    title: 'Deadpool & Wolverine',
    category: '🎬 Movie',
    promoText: 'NOW IN CINEMAS',
    subtitle: 'Book tickets from...',
    image: 'assets/home_images/photo-1440404653325-ab127d49abc1.jpg',
    ctaText: 'Book Tickets',
  ),
  WhatsOnItem(
    id: 'whats-on-art-lagos',
    title: 'Art Lagos Festival',
    category: '🎪 Event',
    promoText: 'FREE THIS WEEKEND',
    subtitle: 'Balmoral Convention...',
    image: 'assets/home_images/photo-1470225620780-dba8ba36b745.jpg',
    ctaText: 'Get Free Pass',
  ),
  WhatsOnItem(
    id: 'whats-on-nok',
    title: 'Dinner at Nok by Alara',
    category: '🏷 Offer',
    promoText: '50% OFF • TODAY ONLY',
    subtitle: 'Ikoyi • Use code FAJI...',
    image: 'assets/home_images/photo-1517248135467-4c7edcad34c4.jpg',
    ctaText: 'Claim Offer',
  ),
  WhatsOnItem(
    id: 'whats-on-sky-bar',
    title: 'Sky Bar Lagos',
    category: '✨ New Venue',
    promoText: 'JUST OPENED',
    subtitle: 'Victoria Island...',
    image: 'assets/home_images/photo-1533777324565-a040eb52facd.jpg',
    ctaText: 'Reserve a Spot',
  ),
  WhatsOnItem(
    id: 'whats-on-filmhouse',
    title: 'Filmhouse Lekki',
    category: '🎥 Cinema',
    promoText: 'NOW SHOWING',
    subtitle: '8 screens • Lekki...',
    image: 'assets/home_images/photo-1489599849927-2ee91cede3ba.jpg',
    ctaText: 'Pick a Showtime',
  ),
];
