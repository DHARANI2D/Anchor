import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';
import 'package:local_auth_darwin/local_auth_darwin.dart';

class SecurityService {
  final LocalAuthentication _auth = LocalAuthentication();

  Future<bool> isBiometricAvailable() async {
    final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
    final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
    return canAuthenticate;
  }

  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Please authenticate to view your security codes',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
        authMessages: const <AuthMessages>[
          AndroidAuthMessages(
            signInTitle: 'Safe Lock',
            deviceCredentialsRequiredTitle: 'Authentication required',
          ),
          IOSAuthMessages(
            cancelButton: 'No thanks',
          ),
        ],
      );
    } on PlatformException catch (e) {
      print('Authentication error: $e');
      return false;
    }
  }
}
