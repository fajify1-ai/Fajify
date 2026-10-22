import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/home_business.dart';

class HomeBusinessRepository {
  HomeBusinessRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  Future<List<HomeBusiness>> loadBusinesses() async {
    try {
      final snapshot = await _firestore
          .collection('businesses')
          .where('isApproved', isEqualTo: true)
          .get();
      return snapshot.docs
          .map((doc) => HomeBusiness.fromFirestore(doc.id, doc.data()))
          .where((business) => business.isActive)
          .toList();
    } catch (_) {
      return <HomeBusiness>[];
    }
  }

  Future<List<HomeBusiness>> loadHomeBusinesses() async {
    final realBusinesses = await loadBusinesses();
    return realBusinesses.isNotEmpty ? realBusinesses : placeholderBusinesses;
  }
}
