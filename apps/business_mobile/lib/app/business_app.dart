import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_controller.dart';
import '../core/config.dart';
import '../core/keycloak_identity_service.dart';
import '../core/models.dart';
import '../core/services.dart';
import '../features/account.dart';
import '../features/dashboard.dart';
import '../features/menu.dart';
import '../features/orders.dart';
import '../features/reservations.dart';
import '../features/services_page.dart';
import '../shared/business_ui.dart';

const destinations = [
  '/dashboard',
  '/reservations',
  '/orders',
  '/menu',
  '/services',
];
const labels = ['Home', 'Reservations', 'Orders', 'Menu', 'Services'];
const icons = [
  Icons.grid_view_rounded,
  Icons.calendar_today_outlined,
  Icons.task_alt,
  Icons.shopping_bag_outlined,
  Icons.star_border_rounded,
];

/// Restrict saved destinations to local, known merchant routes.
String safeDestination(String? candidate) {
  if (candidate == null) return '/dashboard';
  final uri = Uri.tryParse(candidate);
  if (uri == null ||
      uri.hasScheme ||
      uri.hasAuthority ||
      !candidate.startsWith('/') ||
      candidate.startsWith('//') ||
      candidate.contains('\\')) {
    return '/dashboard';
  }
  final valid = RegExp(
    r'^/(dashboard|reservations(?:/[a-zA-Z0-9-]+)?|orders(?:/[a-zA-Z0-9-]+)?|menu(?:/[a-zA-Z0-9-]+)?|services|earnings|profile|scan|notifications|business-setup)$',
  ).hasMatch(uri.path);
  return valid ? uri.toString() : '/dashboard';
}

GoRouter businessRouter(
  BusinessController controller, {
  String? initialLocation,
  VoidCallback? onExit,
  bool embedded = false,
}) {
  Widget watch(Widget Function() build) =>
      AnimatedBuilder(animation: controller, builder: (_, child) => build());
  GoRoute page(String path, Widget Function(GoRouterState) build) => GoRoute(
    path: path,
    pageBuilder: (_, state) =>
        NoTransitionPage(key: state.pageKey, child: watch(() => build(state))),
  );
  return GoRouter(
    initialLocation: initialLocation ?? (embedded ? '/login' : null),
    overridePlatformDefaultLocation: embedded,
    routerNeglect: embedded,
    refreshListenable: controller,
    redirect: (context, state) async {
      final path = state.uri.path;
      final public =
          path == '/onboarding' || path == '/login' || path == '/register';
      if (controller.session == SessionStatus.signedOut) {
        if (path == '/') return '/onboarding';
        if (public) return null;
        return Uri(
          path: '/login',
          queryParameters: {'from': safeDestination(state.uri.toString())},
        ).toString();
      }
      if (controller.session == SessionStatus.denied) {
        return path == '/access-denied' ? null : '/access-denied';
      }
      if (controller.session == SessionStatus.merchant) {
        if (path == '/access-denied') {
          return safeDestination(state.uri.queryParameters['from']);
        }
        if (public || path == '/') {
          return safeDestination(state.uri.queryParameters['from']);
        }
        if (!await controller.revalidateBusinessAccess(destination: path)) {
          return controller.session == SessionStatus.signedOut
              ? '/login'
              : '/access-denied';
        }
        return null;
      }
      if (public || path == '/' || path == '/access-denied') {
        return safeDestination(state.uri.queryParameters['from']);
      }
      return null;
    },
    errorBuilder: (context, state) => Scaffold(
      body: SafeArea(
        child: PageBody(
          title: 'Page not found',
          subtitle: 'Choose a destination to continue.',
          children: [
            FilledButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Go to dashboard'),
            ),
          ],
        ),
      ),
    ),
    routes: [
      page('/', (_) => WelcomePage(onExit: onExit)),
      page('/onboarding', (_) => WelcomePage(onExit: onExit)),
      page('/login', (_) => LoginPage(controller: controller, onExit: onExit)),
      page(
        '/register',
        (_) => IdentityHandoffPage(
          controller: controller,
          onExit: onExit,
        ),
      ),
      page(
        '/access-denied',
        (_) => Scaffold(
          body: SafeArea(
            child: PageBody(
              title: 'Merchant access required',
              subtitle: controller.error ??
                  'Your Faji identity is valid, but no merchant access was confirmed.',
              children: [
                FilledButton(
                  onPressed: controller.logout,
                  child: const Text('Return to login'),
                ),
              ],
            ),
          ),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => BusinessShell(
          controller: controller,
          location: state.uri.path,
          child: child,
        ),
        routes: [
          page('/dashboard', (_) => DashboardPage(controller: controller)),
          page(
            '/reservations',
            (state) => ReservationsPage(
              controller: controller,
              pendingOnly: state.uri.queryParameters['pending'] == 'true',
            ),
          ),
          page(
            '/reservations/:id',
            (state) => ReservationDetailPage(
              controller: controller,
              id: state.pathParameters['id']!,
            ),
          ),
          page('/orders', (_) => OrdersPage(controller: controller)),
          page(
            '/orders/:id',
            (state) => OrderDetailPage(
              controller: controller,
              id: state.pathParameters['id']!,
            ),
          ),
          page('/menu', (_) => MenuPage(controller: controller)),
          page(
            '/menu/new',
            (_) => MenuFormPage(
              key: ValueKey('new-${controller.businessId}'),
              controller: controller,
            ),
          ),
          page(
            '/menu/:id',
            (state) => MenuFormPage(
              key: ValueKey(
                '${controller.businessId}-${state.pathParameters['id']}',
              ),
              controller: controller,
              id: state.pathParameters['id']!,
            ),
          ),
          page(
            '/services',
            (_) => ServicesPage(controller: controller, onExit: onExit),
          ),
          page(
            '/earnings',
            (state) => EarningsPage(
              controller: controller,
              withdraw: state.uri.queryParameters['withdraw'] == 'true',
            ),
          ),
          page(
            '/profile',
            (_) => ProfilePage(
              key: ValueKey(controller.businessId),
              controller: controller,
            ),
          ),
          page('/business-setup', (_) => const BusinessSetupPage()),
          page('/notifications', (_) => const NotificationsPage()),
          page(
            '/scan',
            (state) => ScanPage(
              key: ValueKey(
                '${controller.businessId}-${state.uri.queryParameters['type']}',
              ),
              controller: controller,
              order: state.uri.queryParameters['type'] == 'order',
            ),
          ),
        ],
      ),
    ],
  );
}

class BusinessApp extends StatefulWidget {
  const BusinessApp({
    super.key,
    this.controller,
    this.initialLocation,
    this.config = BusinessConfig.fromBuild,
    this.embedded = false,
    this.onExit,
  }) : assert(!embedded || onExit != null);
  final BusinessController? controller;
  final String? initialLocation;
  final BusinessConfig config;

  /// Hosts the merchant workspace inside another app without a second app root.
  final bool embedded;
  final VoidCallback? onExit;
  @override
  State<BusinessApp> createState() => _BusinessAppState();
}

class _BusinessAppState extends State<BusinessApp> with WidgetsBindingObserver {
  late final controller =
      widget.controller ??
      BusinessController(
        identity: widget.config.useMocks
            ? MockIdentityService()
            : KeycloakIdentityService(widget.config),
      );
  late final router = businessRouter(
    controller,
    initialLocation: widget.initialLocation,
    embedded: widget.embedded,
    onExit: widget.onExit == null ? null : _exit,
  );
  final _heroes = MaterialApp.createMaterialHeroController();
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.config.problem == null) {
      unawaited(controller.restoreSession());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(controller.revalidateBusinessAccess(force: true));
    }
  }

  Future<void> _exit() async {
    if (_leaving) return;
    _leaving = true;
    try {
      await controller.logout();
      if (mounted) widget.onExit?.call();
    } finally {
      _leaving = false;
    }
  }

  void _back() {
    if (router.canPop()) {
      router.pop();
      return;
    }
    final path = router.routeInformationProvider.value.uri.path;
    for (final section in ['/orders', '/reservations', '/menu']) {
      if (path.startsWith('$section/')) {
        router.go(section);
        return;
      }
    }
    if (!destinations.contains(path) &&
        ![
          '/login',
          '/register',
          '/onboarding',
          '/access-denied',
        ].contains(path)) {
      router.go('/dashboard');
      return;
    }
    _exit();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    router.dispose();
    if (widget.controller == null) controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final problem = widget.config.problem;
    final errorPage = Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(problem ?? ''),
                if (widget.onExit != null)
                  TextButton(
                    onPressed: _exit,
                    child: const Text('Back to role selection'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
    if (widget.embedded) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) _back();
        },
        child: Theme(
          data: businessTheme(fontPackage: 'faji_business'),
          child: ScaffoldMessenger(
            child: HeroControllerScope(
              controller: _heroes,
              child: problem != null
                  ? errorPage
                  : Router(
                      routeInformationProvider: router.routeInformationProvider,
                      routeInformationParser: router.routeInformationParser,
                      routerDelegate: router.routerDelegate,
                    ),
            ),
          ),
        ),
      );
    }
    if (problem != null) {
      return MaterialApp(theme: businessTheme(), home: errorPage);
    }
    return MaterialApp.router(
      title: 'Faji Business',
      debugShowCheckedModeBanner: false,
      theme: businessTheme(),
      routerConfig: router,
    );
  }
}

class BusinessShell extends StatelessWidget {
  const BusinessShell({
    super.key,
    required this.controller,
    required this.location,
    required this.child,
  });
  final BusinessController controller;
  final String location;
  final Widget child;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final index = destinations.indexWhere(
        (path) => location == path || location.startsWith('$path/'),
      );
      final selected = index < 0 ? 0 : index;
      return LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 760;
          return Scaffold(
            appBar: AppBar(
              toolbarHeight: 80,
              backgroundColor: surface,
              titleSpacing: 16,
              title: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: brand,
                    foregroundColor: Colors.white,
                    child: Text('D'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: PopupMenuButton<String>(
                      tooltip: 'Switch sample data',
                      enabled: !controller.busy,
                      onSelected: controller.selectBusiness,
                      itemBuilder: (_) => const [
                        PopupMenuItem(
                          value: 'demo-lagos',
                          child: Text('Sample · Lagos'),
                        ),
                        PopupMenuItem(
                          value: 'demo-island',
                          child: Text('Sample · Island'),
                        ),
                      ],
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  controller.businessName,
                                  style: const TextStyle(fontSize: 14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.expand_more, size: 16),
                            ],
                          ),
                          const Row(
                            children: [
                              Icon(Icons.circle, size: 6, color: good),
                              SizedBox(width: 4),
                              Text(
                                'Sample data',
                                style: TextStyle(color: good, fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Notifications',
                  onPressed: () => context.go('/notifications'),
                  icon: const Icon(Icons.notifications_none),
                ),
                IconButton(
                  tooltip: 'Profile and settings',
                  onPressed: () => context.go('/profile'),
                  icon: const Icon(Icons.settings_outlined),
                ),
              ],
            ),
            body: SafeArea(
              top: false,
              child: Row(
                children: [
                  if (wide)
                    NavigationRail(
                      selectedIndex: selected,
                      labelType: NavigationRailLabelType.all,
                      onDestinationSelected: (i) => context.go(destinations[i]),
                      destinations: List.generate(
                        5,
                        (i) => NavigationRailDestination(
                          icon: Icon(icons[i]),
                          label: Text(labels[i]),
                        ),
                      ),
                    ),
                  Expanded(
                    child: Column(
                      children: [
                        Container(
                          color: brand.withValues(alpha: .06),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 2,
                          ),
                          child: Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'DEMO · Sample data',
                                  style: TextStyle(color: muted, fontSize: 11),
                                ),
                              ),
                              TextButton(
                                onPressed: () =>
                                    demoControls(context, controller),
                                child: const Text(
                                  'Demo controls',
                                  style: TextStyle(fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (controller.error != null &&
                            controller.state != LoadState.error)
                          Padding(
                            padding: const EdgeInsets.all(8),
                            child: Text(
                              controller.error!,
                              style: const TextStyle(color: amber),
                            ),
                          ),
                        Expanded(
                          child: DataGate(controller: controller, child: child),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottomNavigationBar: wide
                ? null
                : NavigationBar(
                    selectedIndex: selected,
                    onDestinationSelected: (i) => context.go(destinations[i]),
                    destinations: List.generate(
                      5,
                      (i) => NavigationDestination(
                        icon: Icon(
                          icons[i],
                          color: i == selected ? brand : muted,
                        ),
                        label: labels[i],
                      ),
                    ),
                  ),
          );
        },
      );
    },
  );
}

Future<void> demoControls(
  BuildContext context,
  BusinessController c,
) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  builder: (sheet) => SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Demo controls',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          const Text(
            'Use these controls to inspect loading, empty and error states. Changes are local to this session.',
            style: TextStyle(color: muted),
          ),
          const SizedBox(height: 12),
          for (final scenario in DemoScenario.values)
            ListTile(
              title: Text('Load ${scenario.name} scenario'),
              enabled: !c.busy,
              onTap: () {
                Navigator.pop(sheet);
                c.scenario(scenario);
              },
            ),
          ListTile(
            title: const Text('Fail next sample write'),
            enabled: !c.busy && c.repository is MockBusinessRepository,
            onTap: () {
              (c.repository as MockBusinessRepository).failNextWrite = true;
              Navigator.pop(sheet);
              preview(
                context,
                'Failure armed',
                'The next menu, order or service change will fail without changing its data.',
              );
            },
          ),
          ListTile(
            title: const Text('Reset sample data'),
            enabled: !c.busy,
            onTap: () {
              Navigator.pop(sheet);
              c.reset();
            },
          ),
          ListTile(
            title: const Text('Log Out'),
            onTap: () {
              Navigator.pop(sheet);
              c.logout();
            },
          ),
        ],
      ),
    ),
  ),
);
