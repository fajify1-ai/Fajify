/// An integration gap, distinct from a successful empty response.
class ServiceUnavailable implements Exception {
  const ServiceUnavailable(this.feature);
  final String feature;
  String get message =>
      '$feature is unavailable while backend integration is pending.';
  @override
  String toString() => message;
}
