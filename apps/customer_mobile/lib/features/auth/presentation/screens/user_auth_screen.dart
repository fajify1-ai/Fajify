import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../../main.dart';
import '../../domain/auth_repository.dart';
import '../../domain/auth_input.dart';
import '../widgets/auth_error_message.dart';
import '../widgets/auth_form_layout.dart';
import '../auth_scope.dart';
import '../widgets/auth_divider.dart';
import '../widgets/auth_primary_button.dart';
import '../widgets/auth_segmented_control.dart';
import '../widgets/faji_auth_text_field.dart';
import '../widgets/google_auth_button.dart';

class UserAuthScreen extends StatefulWidget {
  const UserAuthScreen({super.key});
  @override
  State<UserAuthScreen> createState() => _UserAuthScreenState();
}

class _UserAuthScreenState extends State<UserAuthScreen>
    with SingleTickerProviderStateMixin {
  bool register = false;
  bool registering = false;
  bool signingIn = false;
  bool mountedIn = false;
  late final AnimationController _entry = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  )..forward();
  final _signInForm = GlobalKey<FormState>();
  final _registerForm = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _signPassword = TextEditingController();
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _regEmail = TextEditingController();
  final _phone = TextEditingController();
  final _dob = TextEditingController();
  final _address = TextEditingController();
  final _regPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool showSignPassword = false;
  bool showRegPassword = false;
  bool showConfirmPassword = false;
  bool terms = false;

  @override
  void dispose() {
    _entry.dispose();
    for (final c in [
      _email,
      _signPassword,
      _name,
      _username,
      _regEmail,
      _phone,
      _dob,
      _address,
      _regPassword,
      _confirmPassword,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _message(String value) => showAuthMessage(
    context,
    value,
    presentation: AuthMessagePresentation.sheet,
  );

  void _close() {
    HapticFeedback.lightImpact();
    Navigator.of(context).pop();
  }

  void _google() {
    HapticFeedback.lightImpact();
    _message('Google sign-in will be connected later.');
  }

  Future<void> _signIn() async {
    final browserAuth = AuthScope.of(context);
    if (browserAuth.usesBrowserAuthentication) {
      if (signingIn) return;
      setState(() => signingIn = true);
      await browserAuth.authorize();
      if (!mounted) return;
      setState(() => signingIn = false);
      if (browserAuth.canAccessCustomer) {
        Navigator.of(context)
            .pushNamedAndRemoveUntil(FajiRoutes.userHome, (_) => false);
      } else {
        _message(
          browserAuth.state.failure?.message ??
              'Complete sign-in in your browser.',
        );
      }
      return;
    }
    if (signingIn || !(_signInForm.currentState?.validate() ?? false)) return;
    final email = AuthInput.normalizeEmail(_email.text);
    final auth = AuthScope.of(context);
    setState(() => signingIn = true);
    await auth.signIn(email, _signPassword.text);
    if (!mounted) return;
    setState(() => signingIn = false);
    if (auth.canAccessCustomer) {
      _signPassword.clear();
      Navigator.of(context)
          .pushNamedAndRemoveUntil(FajiRoutes.userHome, (route) => false);
    } else {
      _message(
        auth.state.failure?.message ??
            'Your account is not ready for customer access.',
      );
    }
  }

  Future<void> _registerAccount() async {
    final browserAuth = AuthScope.of(context);
    if (browserAuth.usesBrowserAuthentication) {
      if (registering) return;
      setState(() => registering = true);
      await browserAuth.beginRegistration();
      if (!mounted) return;
      setState(() => registering = false);
      _message(
        browserAuth.state.failure?.message ??
            'Complete registration in your browser.',
      );
      return;
    }
    if (registering || !(_registerForm.currentState?.validate() ?? false)) {
      return;
    }
    if (!terms) {
      _message('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    final auth = AuthScope.of(context);
    setState(() => registering = true);
    await auth.register(
      LegacyRegistration(
        email: _regEmail.text,
        password: _regPassword.text,
        fullName: _name.text,
        username: _username.text,
        phone: _phone.text,
        dateOfBirth: _dob.text,
        homeAddress: _address.text,
      ),
    );
    if (!mounted) return;
    setState(() => registering = false);
    if (auth.canAccessCustomer) {
      _regPassword.clear();
      _confirmPassword.clear();
      Navigator.of(context)
          .pushNamedAndRemoveUntil(FajiRoutes.userHome, (route) => false);
    } else {
      _message(
        auth.state.failure?.message ??
            'Your account is not ready for customer access.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: true,
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
        child: Stack(
          children: [
            Positioned.fill(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: Container(color: Colors.black.withValues(alpha: .54)),
              ),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: AnimatedBuilder(
                animation: _entry,
                builder: (context, child) => FractionalTranslation(
                  translation: Offset(
                    0,
                    1 - Curves.easeOutCubic.transform(_entry.value),
                  ),
                  child: child,
                ),
                child: _AuthSheet(
                  register: register,
                  registering: registering,
                  signingIn: signingIn,
                  onClose: _close,
                  onTabChanged: (v) => setState(() => register = v),
                  signInForm: _signInForm,
                  registerForm: _registerForm,
                  signInEmail: _email,
                  signPassword: _signPassword,
                  name: _name,
                  username: _username,
                  regEmail: _regEmail,
                  phone: _phone,
                  dob: _dob,
                  address: _address,
                  regPassword: _regPassword,
                  confirmPassword: _confirmPassword,
                  showSignPassword: showSignPassword,
                  showRegPassword: showRegPassword,
                  showConfirmPassword: showConfirmPassword,
                  terms: terms,
                  onSignPasswordToggle: () =>
                      setState(() => showSignPassword = !showSignPassword),
                  onRegPasswordToggle: () =>
                      setState(() => showRegPassword = !showRegPassword),
                  onConfirmPasswordToggle: () => setState(
                    () => showConfirmPassword = !showConfirmPassword,
                  ),
                  onTermsChanged: (v) => setState(() => terms = v ?? false),
                  onSignIn: _signIn,
                  onRegister: _registerAccount,
                  onGoogle: _google,
                  onMessage: _message,
                  requiredValidator: AuthInput.requiredValue,
                  emailValidator: AuthInput.email,
                  passwordValidator: AuthInput.registrationPassword,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthSheet extends StatelessWidget {
  const _AuthSheet({
    required this.register,
    required this.registering,
    required this.signingIn,
    required this.onClose,
    required this.onTabChanged,
    required this.signInForm,
    required this.registerForm,
    required this.signInEmail,
    required this.signPassword,
    required this.name,
    required this.username,
    required this.regEmail,
    required this.phone,
    required this.dob,
    required this.address,
    required this.regPassword,
    required this.confirmPassword,
    required this.showSignPassword,
    required this.showRegPassword,
    required this.showConfirmPassword,
    required this.onSignPasswordToggle,
    required this.onRegPasswordToggle,
    required this.onConfirmPasswordToggle,
    required this.terms,
    required this.onTermsChanged,
    required this.onSignIn,
    required this.onRegister,
    required this.onGoogle,
    required this.onMessage,
    required this.requiredValidator,
    required this.emailValidator,
    required this.passwordValidator,
  });
  final bool register, registering, signingIn;
  final VoidCallback onClose;
  final ValueChanged<bool> onTabChanged;
  final GlobalKey<FormState> signInForm;
  final GlobalKey<FormState> registerForm;
  final TextEditingController signInEmail,
      signPassword,
      name,
      username,
      regEmail,
      phone,
      dob,
      address,
      regPassword,
      confirmPassword;
  final bool showSignPassword, showRegPassword, showConfirmPassword, terms;
  final VoidCallback onSignPasswordToggle,
      onRegPasswordToggle,
      onConfirmPasswordToggle;
  final ValueChanged<bool?> onTermsChanged;
  final VoidCallback onSignIn, onRegister, onGoogle;
  final ValueChanged<String> onMessage;
  final String? Function(String?, String) requiredValidator;
  final String? Function(String?) emailValidator, passwordValidator;

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;
    // Keep the sheet fixed across both tabs. Register content scrolls inside
    // the available area instead of resizing the anchored sheet.
    final panelHeight = register ? height * .79 : height * .60;
    return Container(
      height: panelHeight,
      width: double.infinity,
      decoration: const BoxDecoration(
        color: FajiColors.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 14),
            Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: FajiColors.borderDark,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(30, 18, 30, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'FAJI ACCOUNT',
                          style: TextStyle(
                            color: FajiColors.primary,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            letterSpacing: .3,
                          ),
                        ),
                        const SizedBox(height: 7),
                        Text(
                          register ? 'Create your account' : 'Welcome back',
                          style: const TextStyle(
                            color: FajiColors.textPrimaryDark,
                            fontSize: 27,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Material(
                    color: const Color(0xFF292929),
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: onClose,
                      customBorder: const CircleBorder(),
                      child: const SizedBox(
                        width: 42,
                        height: 42,
                        child: Icon(
                          Icons.close,
                          color: FajiColors.textSecondaryDark,
                          size: 19,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ScrollConfiguration(
                behavior: ScrollConfiguration.of(context)
                    .copyWith(scrollbars: false, overscroll: false),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(30, 18, 30, 28),
                  child: Column(
                    children: [
                      AuthSegmentedControl(
                        registerSelected: register,
                        onChanged: onTabChanged,
                      ),
                      const SizedBox(height: 16),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 260),
                        transitionBuilder: (child, animation) => FadeTransition(
                          opacity: animation,
                          child: SlideTransition(
                            position: Tween<Offset>(
                              begin: const Offset(0, .04),
                              end: Offset.zero,
                            ).animate(animation),
                            child: child,
                          ),
                        ),
                        child: register
                            ? _RegisterFields(
                                key: const ValueKey('register'),
                                form: registerForm,
                                name: name,
                                username: username,
                                email: regEmail,
                                phone: phone,
                                dob: dob,
                                address: address,
                                password: regPassword,
                                confirm: confirmPassword,
                                showPassword: showRegPassword,
                                showConfirm: showConfirmPassword,
                                onPasswordToggle: onRegPasswordToggle,
                                onConfirmToggle: onConfirmPasswordToggle,
                                terms: terms,
                                onTermsChanged: onTermsChanged,
                                onCreate: onRegister,
                                registering: registering,
                                onGoogle: onGoogle,
                                onMessage: onMessage,
                                requiredValidator: requiredValidator,
                                emailValidator: emailValidator,
                                passwordValidator: passwordValidator,
                              )
                            : _SignInFields(
                                key: const ValueKey('signin'),
                                form: signInForm,
                                email: signInEmail,
                                password: signPassword,
                                showPassword: showSignPassword,
                                signingIn: signingIn,
                                onPasswordToggle: onSignPasswordToggle,
                                onForgot: () =>
                                    Navigator.of(context)
                                        .pushNamed(FajiRoutes.forgotPassword),
                                onSubmit: onSignIn,
                                onGoogle: onGoogle,
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SignInFields extends StatelessWidget {
  const _SignInFields({
    super.key,
    required this.form,
    required this.email,
    required this.password,
    required this.showPassword,
    required this.signingIn,
    required this.onPasswordToggle,
    required this.onForgot,
    required this.onSubmit,
    required this.onGoogle,
  });
  final GlobalKey<FormState> form;
  final TextEditingController email, password;
  final bool showPassword, signingIn;
  final VoidCallback onPasswordToggle, onForgot, onSubmit, onGoogle;
  @override
  Widget build(BuildContext context) =>
      AuthScope.of(context).usesBrowserAuthentication
      ? AuthFormLayout(
          formKey: form,
          children: [
            AuthPrimaryButton(
              label: 'Sign In',
              onTap: onSubmit,
              busy: signingIn,
            ),
            TextButton(
              onPressed: onForgot,
              child: const Text('Forgot password?'),
            ),
          ],
        )
      : AuthFormLayout(
          formKey: form,
          children: [
            _Label('EMAIL OR USERNAME'),
            FajiAuthTextField(
              controller: email,
              hint: 'Enter your email or username',
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: AuthInput.email,
            ),
            const SizedBox(height: 18),
            _Label('PASSWORD'),
            FajiAuthTextField(
              controller: password,
              hint: 'Your password',
              obscureText: !showPassword,
              keyboardType: TextInputType.visiblePassword,
              textInputAction: TextInputAction.done,
              suffixIcon: IconButton(
                onPressed: onPasswordToggle,
                icon: Icon(
                  showPassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: FajiColors.textSecondaryDark,
                ),
              ),
              validator: AuthInput.signInPassword,
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onForgot,
                child: const Text(
                  'Forgot password?',
                  style: TextStyle(color: FajiColors.primary, fontSize: 15),
                ),
              ),
            ),
            const SizedBox(height: 2),
            AuthPrimaryButton(
              label: 'Sign In',
              onTap: onSubmit,
              busy: signingIn,
            ),
            const SizedBox(height: 25),
            const AuthDivider(),
            const SizedBox(height: 22),
            GoogleAuthButton(onTap: onGoogle),
          ],
        );
}

class _RegisterFields extends StatelessWidget {
  const _RegisterFields({
    super.key,
    required this.form,
    required this.name,
    required this.username,
    required this.email,
    required this.phone,
    required this.dob,
    required this.address,
    required this.password,
    required this.confirm,
    required this.showPassword,
    required this.showConfirm,
    required this.terms,
    required this.registering,
    required this.onPasswordToggle,
    required this.onConfirmToggle,
    required this.onTermsChanged,
    required this.onCreate,
    required this.onGoogle,
    required this.onMessage,
    required this.requiredValidator,
    required this.emailValidator,
    required this.passwordValidator,
  });
  final GlobalKey<FormState> form;
  final TextEditingController name,
      username,
      email,
      phone,
      dob,
      address,
      password,
      confirm;
  final bool showPassword, showConfirm, terms, registering;
  final VoidCallback onPasswordToggle, onConfirmToggle, onCreate, onGoogle;
  final ValueChanged<bool?> onTermsChanged;
  final ValueChanged<String> onMessage;
  final String? Function(String?, String) requiredValidator;
  final String? Function(String?) emailValidator, passwordValidator;
  Widget field(
    String label,
    TextEditingController controller,
    String hint, {
    TextInputType? type,
    TextInputAction? action,
    String? Function(String?)? validator,
    Widget? suffix,
    String? prefix,
    VoidCallback? onTap,
    bool readOnly = false,
    bool obscureText = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 15),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(label),
        FajiAuthTextField(
          controller: controller,
          hint: hint,
          keyboardType: type,
          textInputAction: action,
          validator: validator,
          suffixIcon: suffix,
          prefixText: prefix,
          onTap: onTap,
          readOnly: readOnly,
          obscureText: obscureText,
        ),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) =>
      AuthScope.of(context).usesBrowserAuthentication
      ? AuthFormLayout(
          formKey: form,
          children: [
            AuthPrimaryButton(
              label: 'Create Account',
              onTap: onCreate,
              busy: registering,
            ),
          ],
        )
      : AuthFormLayout(
          formKey: form,
          children: [
            field(
              'FULL NAME',
              name,
              'e.g. Adaeze Okonkwo',
              type: TextInputType.name,
              action: TextInputAction.next,
              validator: (v) => requiredValidator(v, 'Full name'),
            ),
            field(
              'USERNAME',
              username,
              'yourhandle',
              type: TextInputType.text,
              action: TextInputAction.next,
              validator: (v) {
                final e = requiredValidator(v, 'Username');
                if (e != null) return e;
                return v!.contains(' ')
                    ? 'Username cannot contain spaces'
                    : null;
              },
              prefix: '@ ',
            ),
            field(
              'EMAIL ADDRESS',
              email,
              'you@email.com',
              type: TextInputType.emailAddress,
              action: TextInputAction.next,
              validator: emailValidator,
            ),
            field(
              'PHONE NUMBER',
              phone,
              '0801 234 5678',
              type: TextInputType.phone,
              action: TextInputAction.next,
              validator: (v) => requiredValidator(v, 'Phone'),
              prefix: '+234  ',
            ),
            field(
              'DATE OF BIRTH',
              dob,
              'mm/dd/yyyy',
              readOnly: true,
              onTap: () => _pickDate(context),
              suffix: IconButton(
                onPressed: () => _pickDate(context),
                icon: const Icon(Icons.calendar_today_outlined, size: 19),
              ),
              validator: (v) => requiredValidator(v, 'Date of birth'),
            ),
            field(
              'HOME ADDRESS',
              address,
              'Street, City, State',
              type: TextInputType.streetAddress,
              action: TextInputAction.next,
              validator: (v) => requiredValidator(v, 'Address'),
            ),
            field(
              'PASSWORD',
              password,
              'Min. 8 characters',
              type: TextInputType.visiblePassword,
              action: TextInputAction.next,
              obscureText: !showPassword,
              suffix: IconButton(
                onPressed: onPasswordToggle,
                icon: Icon(
                  showPassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: FajiColors.textSecondaryDark,
                ),
              ),
              validator: passwordValidator,
            ),
            field(
              'CONFIRM PASSWORD',
              confirm,
              'Re-enter password',
              type: TextInputType.visiblePassword,
              action: TextInputAction.done,
              obscureText: !showConfirm,
              suffix: IconButton(
                onPressed: onConfirmToggle,
                icon: Icon(
                  showConfirm
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: FajiColors.textSecondaryDark,
                ),
              ),
              validator: (v) {
                final e = passwordValidator(v);
                return e ??
                    (v != password.text ? 'Passwords do not match' : null);
              },
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Checkbox(
                  value: terms,
                  onChanged: onTermsChanged,
                  activeColor: FajiColors.primary,
                  side: const BorderSide(color: FajiColors.borderDark),
                ),
                Expanded(
                  child: Wrap(
                    children: [
                      const Text(
                        "I agree to Faji's ",
                        style: TextStyle(
                          color: FajiColors.textSecondaryDark,
                          fontSize: 12,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => onMessage(
                          'Terms of Service will be connected later.',
                        ),
                        child: const Text(
                          'Terms of Service',
                          style: TextStyle(
                            color: FajiColors.primary,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const Text(
                        ' and ',
                        style: TextStyle(
                          color: FajiColors.textSecondaryDark,
                          fontSize: 12,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => onMessage(
                          'Privacy Policy will be connected later.',
                        ),
                        child: const Text(
                          'Privacy Policy',
                          style: TextStyle(
                            color: FajiColors.primary,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            AuthPrimaryButton(
              label: 'Create Account',
              onTap: onCreate,
              busy: registering,
            ),
            const SizedBox(height: 25),
            const AuthDivider(),
            const SizedBox(height: 22),
            GoogleAuthButton(onTap: onGoogle),
          ],
        );
  Future<void> _pickDate(BuildContext context) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 18),
      firstDate: DateTime(1900),
      lastDate: now,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: FajiColors.primary,
            surface: FajiColors.surfaceDark,
          ),
        ),
        child: child!,
      ),
    );
    if (date != null) {
      dob.text =
          '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
    }
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 7),
    child: Text(
      text,
      style: const TextStyle(
        color: FajiColors.textSecondaryDark,
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: .2,
      ),
    ),
  );
}
