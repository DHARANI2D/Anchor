import 'package:otp/otp.dart';
import 'package:base32/base32.dart';

class TOTPService {
  String generateCode(String secret) {
    try {
      // Ensure secret is properly padded for base32 decoding
      String paddedSecret = secret.toUpperCase();
      while (paddedSecret.length % 8 != 0) {
        paddedSecret += '=';
      }
      
      return OTP.generateTOTPCodeString(
        paddedSecret,
        DateTime.now().millisecondsSinceEpoch,
        interval: 30,
        length: 6,
        algorithm: Algorithm.SHA1,
        isGoogle: true,
      );
    } catch (e) {
      print('Error generating TOTP: $e');
      return '000000';
    }
  }

  int getRemainingSeconds() {
    return 30 - (DateTime.now().second % 30);
  }

  double getProgress() {
    return getRemainingSeconds() / 30.0;
  }
}
