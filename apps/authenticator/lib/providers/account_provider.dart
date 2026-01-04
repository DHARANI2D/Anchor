import 'package:flutter/material.dart';
import '../models/account.dart';
import '../services/storage_service.dart';

class AccountProvider with ChangeNotifier {
  final StorageService _storageService = StorageService();
  List<Account> _accounts = [];

  List<Account> get accounts => _accounts;

  AccountProvider() {
    loadAccounts();
  }

  Future<void> loadAccounts() async {
    _accounts = await _storageService.loadAccounts();
    notifyListeners();
  }

  Future<void> addAccount(Account account) async {
    _accounts.add(account);
    await _storageService.saveAccounts(_accounts);
    notifyListeners();
  }

  Future<void> removeAccount(String id) async {
    _accounts.removeWhere((a) => a.id == id);
    await _storageService.saveAccounts(_accounts);
    notifyListeners();
  }
}
