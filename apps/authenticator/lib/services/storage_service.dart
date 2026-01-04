import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/account.dart';

class StorageService {
  static const _storage = FlutterSecureStorage();
  static const _key = 'anchor_accounts';

  Future<void> saveAccounts(List<Account> accounts) async {
    final jsonString = jsonEncode(accounts.map((a) => a.toJson()).toList());
    await _storage.write(key: _key, value: jsonString);
  }

  Future<List<Account>> loadAccounts() async {
    final jsonString = await _storage.read(key: _key);
    if (jsonString == null) return [];
    final List<dynamic> jsonList = jsonDecode(jsonString);
    return jsonList.map((j) => Account.fromJson(j)).toList();
  }
}
