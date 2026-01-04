class Account {
  final String id;
  final String issuer;
  final String username;
  final String secret;

  Account({
    required this.id,
    required this.issuer,
    required this.username,
    required this.secret,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'issuer': issuer,
        'username': username,
        'secret': secret,
      };

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'],
        issuer: json['issuer'],
        username: json['username'],
        secret: json['secret'],
      );
}
