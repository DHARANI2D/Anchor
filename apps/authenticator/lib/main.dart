import 'dart:io';
import 'package:anchor_authenticator/services/security_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:screen_protector/screen_protector.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'providers/account_provider.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  if (Platform.isAndroid) {
    await ScreenProtector.preventScreenshotOn();
  }
  
  runApp(const AnchorAuthenticatorApp());
}

class AnchorAuthenticatorApp extends StatefulWidget {
  const AnchorAuthenticatorApp({super.key});

  @override
  State<AnchorAuthenticatorApp> createState() => _AnchorAuthenticatorAppState();
}

class _AnchorAuthenticatorAppState extends State<AnchorAuthenticatorApp> {
  final SecurityService _securityService = SecurityService();
  bool _isAuthenticated = false;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final available = await _securityService.isBiometricAvailable();
    if (available) {
      final success = await _securityService.authenticate();
      if (mounted) {
        setState(() {
          _isAuthenticated = success;
          _isChecking = false;
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _isAuthenticated = true; // Fallback if no biometrics
          _isChecking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AccountProvider(),
      child: MaterialApp(
        title: 'SafeVault',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.dark,
        darkTheme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF6366F1),
            brightness: Brightness.dark,
            surface: const Color(0xFF0F172A),
            primary: const Color(0xFF818CF8),
            secondary: const Color(0xFF2DD4BF),
          ),
          textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
          cardTheme: CardThemeData(
            elevation: 0,
            color: const Color(0xFF1E293B).withOpacity(0.7),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(
                color: const Color(0xFFFFFFFF).withOpacity(0.1),
                width: 1,
              ),
            ),
          ),
          appBarTheme: AppBarTheme(
            backgroundColor: const Color(0xFF0F172A),
            elevation: 0,
            centerTitle: true,
            titleTextStyle: GoogleFonts.outfit(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        home: _isChecking
            ? const _LockedScreen(message: 'Initializing...')
            : _isAuthenticated
                ? const HomeScreen()
                : const _LockedScreen(
                    message: 'Authentication Required',
                  ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
      ),
    );
  }
}

class _LockedScreen extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const _LockedScreen({required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_outline, size: 80, color: Color(0xFF818CF8)),
            const SizedBox(height: 24),
            Text(
              message,
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w500),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry Authentication'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
