import 'package:flutter/foundation.dart';

import '../../../../core/data/service_unavailable.dart';
import '../models/wishlist_item.dart';

abstract interface class CustomerWishlistRepository {
  List<WishlistItem> get items;
  Future<void> loadForCurrentUser();
  void add(WishlistItem item);
  void remove(String id);
}

/// No optimistic success or cross-account cache before server persistence exists.
class WishlistRepository extends ChangeNotifier
    implements CustomerWishlistRepository {
  WishlistRepository._();
  static final instance = WishlistRepository._();
  static const unavailable = ServiceUnavailable('Wishlist');
  @override
  List<WishlistItem> get items => const [];
  Set<String> get savedIds => const {};
  bool isSaved(String id) => false;
  String get loadError => unavailable.message;
  @override
  Future<void> loadForCurrentUser() async {}

  void toggle(WishlistItem item) => add(item);
  @override
  void add(WishlistItem item) => throw unavailable;
  @override
  void remove(String id) => throw unavailable;
}
