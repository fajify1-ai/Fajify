import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/business_controller.dart';
import '../core/models.dart';
import '../core/services.dart';
import '../shared/business_ui.dart';
import 'dashboard.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key, this.onExit});
  final VoidCallback? onExit;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              children: [
                const Icon(Icons.storefront_outlined, size: 72, color: brand),
                const SizedBox(height: 28),
                const Text(
                  'Faji Business',
                  style: TextStyle(fontSize: 40, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Plan. Book. Enjoy.',
                  style: TextStyle(fontSize: 24),
                ),
                const SizedBox(height: 12),
                const Text(
                  'A calmer way to manage your venue, guests and orders.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: muted),
                ),
                const SizedBox(height: 50),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Continue to Faji Business'),
                  ),
                ),
                if (onExit != null)
                  TextButton(
                    onPressed: onExit,
                    child: const Text('Back to role selection'),
                  ),
                const SizedBox(height: 14),
                const Text(
                  'Secure identity sign-in · sample business workflows',
                  style: TextStyle(color: muted, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class LoginPage extends StatelessWidget {
  const LoginPage({super.key, required this.controller, this.onExit});
  final BusinessController controller;
  final VoidCallback? onExit;
  @override
  Widget build(BuildContext context) {
    final demoMode = controller.identity is MockIdentityService;
    return Scaffold(
      body: SafeArea(
        child: PageBody(
          title: 'Welcome to Faji Business',
          subtitle: 'Merchant workspace',
          children: [
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.storefront_outlined, color: brand, size: 40),
                  const SizedBox(height: 18),
                  const Text(
                    'Your business, in one place',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    demoMode
                        ? 'Explore sample business workflows. No live merchant data or account access is used.'
                        : 'Sign in or create a Faji identity with Keycloak. Only backend-confirmed merchant accounts can continue.',
                    style: const TextStyle(color: muted),
                  ),
                ],
              ),
            ),
            if (controller.error != null)
              Text(controller.error!, style: const TextStyle(color: amber)),
            if (demoMode) ...[
              FilledButton(
                key: const ValueKey('enter-demo'),
                onPressed: controller.signingIn ? null : controller.enterDemo,
                child: Text(
                  controller.signingIn
                      ? 'Opening sample…'
                      : 'Enter sample merchant session',
                ),
              ),
              OutlinedButton(
                onPressed: controller.signingIn
                    ? null
                    : () => controller.enterDemo(merchant: false),
                child: const Text('Test account without merchant access'),
              ),
            ] else ...[
              FilledButton(
                onPressed: controller.signingIn ? null : controller.signIn,
                child: Text(
                  controller.signingIn ? 'Connecting…' : 'Sign In with Faji',
                ),
              ),
              OutlinedButton(
                onPressed: controller.signingIn
                    ? null
                    : () => context.go('/register'),
                child: const Text('Register Your Business'),
              ),
              TextButton(
                onPressed: controller.signingIn ? null : controller.signIn,
                child: const Text('Forgot password? Continue to Keycloak'),
              ),
            ],
            TextButton(
              onPressed: () => context.go('/onboarding'),
              child: const Text('Back to introduction'),
            ),
            if (onExit != null)
              TextButton(
                onPressed: onExit,
                child: const Text('Back to role selection'),
              ),
          ],
        ),
      ),
    );
  }
}

class IdentityHandoffPage extends StatelessWidget {
  const IdentityHandoffPage({
    super.key,
    required this.controller,
    this.onExit,
  });

  final BusinessController controller;
  final VoidCallback? onExit;

  @override
  Widget build(BuildContext context) {
    final demoMode = controller.identity is MockIdentityService;
    return Scaffold(
      body: SafeArea(
        child: PageBody(
          title: 'Register Your Business',
          subtitle: 'Create or reuse a Faji identity',
          children: [
            const Panel(
              child: Text(
                'Continue to Keycloak to create or sign in to a Faji identity. '
                'Identity registration does not register, approve, or grant access '
                'to a business. Merchant onboarding and approval are handled separately.',
              ),
            ),
            if (demoMode)
              const Text(
                'Identity registration is unavailable in sample mode. Use a configured Keycloak build.',
                style: TextStyle(color: muted),
              )
            else
              FilledButton(
                onPressed: controller.signingIn ? null : controller.signIn,
                child: Text(
                  controller.signingIn
                      ? 'Connecting…'
                      : 'Continue to secure identity',
                ),
              ),
            TextButton(
              onPressed: () => context.go('/login'),
              child: const Text('Back to Sign In'),
            ),
            if (onExit != null)
              TextButton(
                onPressed: onExit,
                child: const Text('Back to role selection'),
              ),
          ],
        ),
      ),
    );
  }
}

class BusinessSetupPage extends StatefulWidget {
  const BusinessSetupPage({super.key, this.registration = false, this.onExit});
  final bool registration;
  final VoidCallback? onExit;
  @override
  State<BusinessSetupPage> createState() => _BusinessSetupPageState();
}

class _BusinessSetupPageState extends State<BusinessSetupPage> {
  final form = GlobalKey<FormState>();
  bool submitted = false;
  @override
  Widget build(BuildContext context) => PageBody(
    title: widget.registration ? 'Register Your Business' : 'Business setup',
    subtitle: 'Preview merchant onboarding',
    children: [
      Form(
        key: form,
        child: Column(
          children: [
            for (final label in [
              'Business name',
              'Contact name',
              'Branch address',
            ]) ...[
              TextFormField(
                decoration: InputDecoration(labelText: label),
                maxLength: 120,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Enter $label' : null,
              ),
              const SizedBox(height: 14),
            ],
            TextFormField(
              decoration: const InputDecoration(labelText: 'Contact email'),
              keyboardType: TextInputType.emailAddress,
              maxLength: 120,
              validator: (v) =>
                  v == null ||
                      !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                  ? 'Enter a valid email address'
                  : null,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Business category'),
              items: [
                'Restaurant',
                'Lounge',
                'Event venue',
                'Other',
              ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (_) {},
              validator: (v) => v == null ? 'Select a category' : null,
            ),
          ],
        ),
      ),
      OutlinedButton.icon(
        onPressed: () => preview(
          context,
          'Verification documents',
          'Private document uploads and approval will be connected in M3. No file is uploaded in this preview.',
        ),
        icon: const Icon(Icons.description_outlined),
        label: const Text('Document upload preview'),
      ),
      FilledButton(
        onPressed: () {
          if (form.currentState!.validate()) setState(() => submitted = true);
        },
        child: const Text('Preview setup'),
      ),
      if (submitted)
        const Panel(
          child: Text(
            'Sample setup validated locally. No business was registered or approved.',
          ),
        ),
      TextButton(
        onPressed: () =>
            context.go(widget.registration ? '/login' : '/dashboard'),
        child: Text(widget.registration ? 'Sign In' : 'Back to dashboard'),
      ),
      if (widget.registration && widget.onExit != null)
        TextButton(
          onPressed: widget.onExit,
          child: const Text('Back to role selection'),
        ),
    ],
  );
}

class EarningsPage extends StatelessWidget {
  const EarningsPage({
    super.key,
    required this.controller,
    this.withdraw = false,
  });
  final BusinessController controller;
  final bool withdraw;
  @override
  Widget build(BuildContext context) => controller.state == LoadState.empty
      ? PageBody(
          title: 'Earnings',
          subtitle: 'Sample financial overview',
          children: [emptyState('No sample financial activity.')],
        )
      : PageBody(
          title: 'Earnings',
          subtitle: 'Sample financial overview · NGN',
          children: [
            const Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Available sample balance',
                    style: TextStyle(color: muted),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '₦320,000',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Demonstration amount, not a payable balance.',
                    style: TextStyle(color: muted),
                  ),
                ],
              ),
            ),
            if (withdraw)
              const Text(
                'Withdrawal preview: live payouts arrive with M5 financial integration.',
              ),
            FilledButton(
              onPressed: () => preview(
                context,
                'Withdrawal preview',
                'This sample balance cannot be withdrawn. Verified payments, settlements and payout eligibility will be implemented in Milestone 5.',
              ),
              child: const Text('Preview withdrawal'),
            ),
            const RevenueChart(),
            const SectionHeading('Sample history'),
            const Panel(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.receipt_long_outlined, color: good),
                title: Text('Sample weekly activity'),
                subtitle: Text('Illustration only · 24–30 August 2026'),
                trailing: Text('₦853,000'),
              ),
            ),
            TextButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Back to dashboard'),
            ),
          ],
        );
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.controller});
  final BusinessController controller;
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final form = GlobalKey<FormState>();
  late final TextEditingController contact;
  @override
  void initState() {
    super.initState();
    contact = TextEditingController(text: widget.controller.profileContact);
  }

  @override
  void dispose() {
    contact.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageBody(
    title: 'Profile & settings',
    subtitle: widget.controller.businessName,
    children: [
      Panel(
        child: Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.controller.businessName,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: contact,
                decoration: const InputDecoration(
                  labelText: 'Sample contact email',
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    v == null ||
                        !RegExp(
                          r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                        ).hasMatch(v.trim())
                    ? 'Enter a valid email address'
                    : null,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (form.currentState!.validate()) {
                    widget.controller.profileContact = contact.text.trim();
                    feedback(context, true);
                  }
                },
                child: const Text('Save local profile preview'),
              ),
            ],
          ),
        ),
      ),
      OutlinedButton(
        onPressed: () => context.go('/business-setup'),
        child: const Text('Business setup preview'),
      ),
      TextButton(
        onPressed: widget.controller.logout,
        child: const Text('Log Out'),
      ),
    ],
  );
}

class ScanPage extends StatefulWidget {
  const ScanPage({super.key, required this.controller, required this.order});
  final BusinessController controller;
  final bool order;
  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final code = TextEditingController();
  String? result;
  @override
  void dispose() {
    code.dispose();
    super.dispose();
  }

  void scan(String value) => setState(
    () => result = widget.controller.scan(
      order: widget.order,
      code: value.trim(),
    ),
  );
  @override
  Widget build(BuildContext context) => PageBody(
    title: widget.order ? 'Verify order recipient' : 'Guest check-in',
    subtitle: 'Mock scan preview · no camera access required',
    children: [
      const Panel(
        child: Column(
          children: [
            Icon(Icons.qr_code_scanner, size: 90, color: brand),
            SizedBox(height: 14),
            Text(
              'Enter a sample code or choose a result below. This preview does not redeem tickets or verify payments.',
              textAlign: TextAlign.center,
              style: TextStyle(color: muted),
            ),
          ],
        ),
      ),
      TextField(
        controller: code,
        decoration: InputDecoration(
          labelText: 'Sample code',
          hintText: widget.order ? 'order-1' : 'booking-1',
        ),
        onSubmitted: scan,
      ),
      FilledButton(
        onPressed: () => scan(code.text),
        child: const Text('Check sample code'),
      ),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final entry in {
            'Valid': widget.order ? 'order-1' : 'booking-1',
            'Invalid': 'INVALID',
            'Already used': 'USED',
            'Failure': 'FAIL',
          }.entries)
            OutlinedButton(
              onPressed: () => scan(entry.value),
              child: Text(entry.key),
            ),
        ],
      ),
      if (result != null)
        Semantics(liveRegion: true, child: Panel(child: Text(result!))),
      TextButton(
        onPressed: () => context.go(widget.order ? '/orders' : '/reservations'),
        child: const Text('Back'),
      ),
    ],
  );
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});
  @override
  Widget build(BuildContext context) => PageBody(
    title: 'Notifications',
    subtitle: 'Synthetic messages',
    children: const [
      Panel(
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(Icons.notifications_outlined, color: brand),
          title: Text('Welcome to your Business demo'),
          subtitle: Text(
            'Explore your dashboard, bookings and menu. No live notifications are sent.',
          ),
        ),
      ),
    ],
  );
}
