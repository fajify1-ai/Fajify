# Fajify

Faji is an integrated lifestyle platform for experience discovery, reservations, business operations and ride dispatch.

## Engineering architecture

| Component | Planned technology |
| --- | --- |
| Customer mobile | Flutter / Dart |
| Business mobile | Flutter / Dart |
| Ride and dispatch mobile | Flutter / Dart |
| Customer and admin web | Next.js / TypeScript |
| API | NestJS / TypeScript on Node.js |
| Data | PostgreSQL and PostGIS |
| Identity | Keycloak / OIDC |
| Jobs and cache | Redis and BullMQ |
| Payments | Paystack or Flutterwave |

The customer Flutter app is being migrated from [Faith-loves/Faji](https://github.com/Faith-loves/Faji) in a separately reviewed branch. The source repository is not modified.

See `docs/migration/IMPORT.md` in the migration branch for provenance and limitations. The project is under development.
