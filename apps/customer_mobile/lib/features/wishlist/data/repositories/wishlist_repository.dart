import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../models/wishlist_item.dart';

class WishlistRepository extends ChangeNotifier {
  WishlistRepository._();

  static final instance = WishlistRepository._();
  final List<WishlistItem> _items = <WishlistItem>[];
  String? _loadError;

  List<WishlistItem> get items => List.unmodifiable(_items);
  Set<String> get savedIds => {
        for (final item in _items) item.id,
        for (final item in _items) item.sourceId,
      };
  bool isSaved(String id) => _items.any((item) => item.id == id);
  String? get loadError => _loadError;

  Future<void> loadForCurrentUser() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    _loadError = null;
    _items.clear();
    notifyListeners();
    if (uid == null) return;
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('wishlist')
          .orderBy('createdAt', descending: true)
          .get();
      _items
        ..clear()
        ..addAll(snapshot.docs.map((doc) => _fromMap(doc.id, doc.data())).whereType<WishlistItem>());
      notifyListeners();
    } catch (_) {
      _loadError = "We couldn't load your wishlist.";
      notifyListeners();
    }
  }

  void toggle(WishlistItem item) {
    if (isSaved(item.id)) {
      remove(item.id);
    } else {
      add(item);
    }
  }

  void add(WishlistItem item) {
    _items.removeWhere((saved) => saved.id == item.id);
    _items.insert(0, item);
    notifyListeners();
    unawaited(_persist(item));
  }

  void remove(String id) {
    _items.removeWhere((item) => item.id == id);
    notifyListeners();
    unawaited(_delete(id));
  }

  Map<String, Object?> _toMap(WishlistItem item, String uid) => {
        'userId': uid,
        'sourceId': item.sourceId,
        'sourceType': item.sourceType.name,
        'businessId': item.businessId,
        'planId': item.planId,
        'title': item.title,
        'imageUrl': item.imageUrl,
        'category': item.category,
        'location': item.location,
        'price': item.price,
        'rating': item.rating,
        'isPlaceholder': item.isPlaceholder,
        'createdAt': Timestamp.fromDate(item.createdAt),
      };

  Future<void> _persist(WishlistItem item) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('wishlist')
          .doc(item.id)
          .set(_toMap(item, uid));
    } catch (_) {}
  }

  Future<void> _delete(String id) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      await FirebaseFirestore.instance.collection('users').doc(uid).collection('wishlist').doc(id).delete();
    } catch (_) {}
  }

  WishlistItem? _fromMap(String id, Map<String, dynamic> data) {
    final created = (data['createdAt'] as Timestamp?)?.toDate();
    final typeName = data['sourceType'] as String?;
    if (created == null || typeName == null) return null;
    WishlistSourceType type;
    try {
      type = WishlistSourceType.values.byName(typeName);
    } catch (_) {
      return null;
    }
    return WishlistItem(
      id: id,
      sourceId: data['sourceId'] as String? ?? id,
      sourceType: type,
      businessId: data['businessId'] as String? ?? '',
      planId: data['planId'] as String? ?? '',
      title: data['title'] as String? ?? 'Saved place',
      imageUrl: data['imageUrl'] as String? ?? '',
      category: data['category'] as String? ?? 'Place',
      location: data['location'] as String? ?? '',
      price: (data['price'] as num?)?.toInt(),
      rating: (data['rating'] as num?)?.toDouble(),
      isPlaceholder: data['isPlaceholder'] as bool? ?? false,
      createdAt: created,
    );
  }
}
