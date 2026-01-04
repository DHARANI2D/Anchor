import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:glassmorphism_ui/glassmorphism_ui.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/account.dart';
import '../services/totp_service.dart';

class AccountItem extends StatefulWidget {
  final Account account;
  final VoidCallback onDelete;

  const AccountItem({
    super.key,
    required this.account,
    required this.onDelete,
  });

  @override
  State<AccountItem> createState() => _AccountItemState();
}

class _AccountItemState extends State<AccountItem> {
  final TOTPService _totpService = TOTPService();
  late Timer _timer;
  String _code = '';
  double _progress = 1.0;
  bool _isCopied = false;

  @override
  void initState() {
    super.initState();
    _updateCode();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateCode();
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  void _updateCode() {
    setState(() {
      _code = _totpService.generateCode(widget.account.secret);
      _progress = _totpService.getProgress();
    });
  }

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: _code.replaceAll(' ', '')));
    setState(() => _isCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isCopied = false);
    });
    
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: GlassContainer(
        blur: 12,
        opacity: 0.1,
        borderRadius: BorderRadius.circular(24),
        border: Border.fromBorderSide(
          BorderSide(color: Colors.white.withOpacity(0.12), width: 1.5),
        ),
        child: InkWell(
          onTap: _copyToClipboard,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.account.issuer.toUpperCase(),
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  letterSpacing: 2,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.account.username,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.more_vert),
                      onPressed: widget.onDelete,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              _code.substring(0, 3) + ' ' + _code.substring(3),
                              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 2,
                                    color: _isCopied 
                                      ? Theme.of(context).colorScheme.secondary 
                                      : Theme.of(context).colorScheme.onSurface,
                                  ),
                            ),
                            if (_isCopied)
                              Padding(
                                padding: const EdgeInsets.only(left: 8.0),
                                child: const Icon(Icons.check_circle, size: 16, color: Colors.tealAccent)
                                  .animate().scale().fadeIn(),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isCopied ? 'Copied to clipboard' : 'Tap to copy',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: _isCopied 
                                  ? Theme.of(context).colorScheme.secondary 
                                  : Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                              ),
                        ),
                      ],
                    ),
                    SizedBox(
                      width: 48,
                      height: 48,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CircularProgressIndicator(
                            value: _progress,
                            strokeWidth: 4,
                            backgroundColor: Colors.white.withOpacity(0.05),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _progress < 0.2
                                  ? Theme.of(context).colorScheme.error
                                  : Theme.of(context).colorScheme.secondary,
                            ),
                          ),
                          Text(
                            '${(30 * _progress).toInt()}',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
