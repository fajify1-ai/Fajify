# Faji Business — M1 visual references

The seven original screenshots supplied for Developer 3A are committed here so a
checkout contains the visual handoff. Phone/browser framing is reference context;
implement only the application content. The development guide contains the screen
mapping and the corrections to source inconsistencies.

| Reference | Screen |
| --- | --- |
| [457536.jpg](457536.jpg) | Dashboard |
| [457537.jpg](457537.jpg) | Reservations |
| [457538.jpg](457538.jpg) | Orders |
| [457539.jpg](457539.jpg) | Menu |
| [457540.jpg](457540.jpg) | Services, upper section |
| [457541.jpg](457541.jpg) | Services, lower section |
| [457489.jpg](457489.jpg) | Brand and customer role-selection reference |

## Implementation review

The PNGs in [implementation/](implementation/) are **Flutter widget renders** at
390 and 1440 logical pixels with the bundled Roboto font and Material icons.
They are not browser or real-device screenshots. Regenerate from
`apps/business_mobile` with:

```bash
flutter test scripts/render_review_test.dart
```

| Screen | Compact | Wide |
| --- | --- | --- |
| Dashboard | [390](implementation/dashboard-390.png) | [1440](implementation/dashboard-1440.png) |
| Reservations | [390](implementation/reservations-390.png) | [1440](implementation/reservations-1440.png) |
| Orders | [390](implementation/orders-390.png) | [1440](implementation/orders-1440.png) |
| Menu | [390](implementation/menu-390.png) | [1440](implementation/menu-1440.png) |
| Services | [390](implementation/services-390.png) | [1440](implementation/services-1440.png) |
| Profile | [390](implementation/profile-390.png) | [1440](implementation/profile-1440.png) |

Lower scroll positions are also captured:
[Dashboard compact](implementation/dashboard-390-bottom.png),
[Dashboard wide](implementation/dashboard-1440-bottom.png),
[Services compact](implementation/services-390-bottom.png),
[Services wide](implementation/services-1440-bottom.png).

The scaffold uses category icons in place of menu photographs and an original
geometric **B development icon** rather than copying the reference logo. Confirm
final logo artwork and store identifiers before distribution. Shared widget and
font extraction remains coordinated with Developer 2.
