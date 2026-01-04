import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/account_provider.dart';
import '../widgets/account_item.dart';
import 'scanner_screen.dart';
import '../models/account.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            title: const Text('SafeVault'),
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                'SafeVault',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Theme.of(context).colorScheme.primary.withOpacity(0.1),
                      Theme.of(context).colorScheme.surface,
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: SearchBar(
                controller: _searchController,
                hintText: 'Search accounts...',
                leading: const Icon(Icons.search),
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value.toLowerCase();
                  });
                },
                backgroundColor: WidgetStateProperty.all(
                  Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
                ),
                elevation: WidgetStateProperty.all(0),
                shape: WidgetStateProperty.all(
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ),
          Consumer<AccountProvider>(
            builder: (context, provider, child) {
              final filteredAccounts = provider.accounts.where((account) {
                return account.issuer.toLowerCase().contains(_searchQuery) ||
                    account.username.toLowerCase().contains(_searchQuery);
              }).toList();

              if (provider.accounts.isEmpty) {
                return SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.shield_outlined,
                          size: 120,
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                        ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
                        const SizedBox(height: 24),
                        Text(
                          'No accounts yet',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ).animate().fadeIn(delay: 200.ms),
                        const SizedBox(height: 8),
                        Text(
                          'Your secure sanctuary for 2FA',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ).animate().fadeIn(delay: 400.ms),
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          onPressed: () => _scanQRCode(context),
                          icon: const Icon(Icons.add),
                          label: const Text('Add your first account'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ).animate().fadeIn(delay: 600.ms).moveY(begin: 20, end: 0),
                      ],
                    ),
                  ),
                );
              }

              if (filteredAccounts.isEmpty) {
                return const SliverFillRemaining(
                  child: Center(child: Text('No matching accounts found')),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.only(bottom: 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final account = filteredAccounts[index];
                      return AccountItem(
                        account: account,
                        onDelete: () => _confirmDelete(context, provider, account),
                      ).animate().fadeIn(delay: (index * 50).ms).moveX(begin: 20, end: 0);
                    },
                    childCount: filteredAccounts.length,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _scanQRCode(context),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        label: const Text('Scan QR'),
        icon: const Icon(Icons.qr_code_scanner),
      ).animate().fadeIn(delay: 800.ms).scale(),
    );
  }

  Future<void> _scanQRCode(BuildContext context) async {
    final account = await Navigator.push<Account>(
      context,
      MaterialPageRoute(builder: (context) => const ScannerScreen()),
    );

    if (account != null) {
      if (!context.mounted) return;
      Provider.of<AccountProvider>(context, listen: false).addAccount(account);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Account ${account.issuer} added!'),
          backgroundColor: Theme.of(context).colorScheme.secondary,
        ),
      );
    }
  }

  void _confirmDelete(BuildContext context, AccountProvider provider, Account account) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove account'),
        content: Text('This will permanently delete ${account.issuer} (${account.username}). Go ahead?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep it'),
          ),
          FilledButton(
            onPressed: () {
              provider.removeAccount(account.id);
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Theme.of(context).colorScheme.onError,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }
}
