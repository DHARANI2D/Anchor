# ⚓ ANCHOR: Secure Version Control System

ANCHOR is a next-generation, high-performance version control platform designed for security, scalability, and ease of use. It provides a complete ecosystem including a robust backend, a sleek web interface, a powerful CLI, and a mobile authenticator for ultimate security.

---

## 🏗️ Architecture

ANCHOR is built with a modular architecture to ensure maximum reliability and performance:

- **Backend**: High-performance API built with Python, managing encrypted repositories and user authentication.
- **Frontend**: A sleek, modern dashboard built with Next.js, featuring real-time system monitoring and repository exploration.
- **CLI**: A Git-compatible command-line interface for seamless development workflows.
- **Authenticator**: A Flutter-based mobile app providing Two-Factor Authentication (2FA) for sensitive operations.

---

## ✨ Features

### 🛡️ Advanced Security
- **Encrypted Config Database**: All sensitive settings are stored with industry-standard encryption.
- **Two-Factor Authentication (2FA)**: Mandatory verification for critical actions.
- **Security Matrix**: Real-time monitoring of rotating refresh tokens, device fingerprinting, and RBAC authorization.

### 📊 Real-time Monitoring
- **System Status**: Live dashboard showing service health, uptime, and resource usage.
- **Service Network Health**: Visual verification that all core systems are operational.

### 🚀 Developer Experience
- **Git Compatibility**: Use familiar commands like `anchor add`, `anchor commit`, `anchor push`.
- **Repository Exploration**: Easily browse and manage your private repositories through the web UI.
- **Favorite System**: Bookmark important repositories for quick access.

---

## 📸 Screenshots

````carousel
![Login & 2FA](file:///Users/dharanidharansenthilkumar/.gemini/antigravity/brain/d5509fae-a771-4411-835b-8cc4cfae48ef/uploaded_image_0_1767533713818.png)
<!-- slide -->
![User Dashboard](file:///Users/dharanidharansenthilkumar/.gemini/antigravity/brain/d5509fae-a771-4411-835b-8cc4cfae48ef/uploaded_image_1_1767533713818.png)
<!-- slide -->
![System Status](file:///Users/dharanidharansenthilkumar/.gemini/antigravity/brain/d5509fae-a771-4411-835b-8cc4cfae48ef/uploaded_image_2_1767533713818.png)
<!-- slide -->
![Security Matrix](file:///Users/dharanidharansenthilkumar/.gemini/antigravity/brain/d5509fae-a771-4411-835b-8cc4cfae48ef/uploaded_image_3_1767533713818.png)
<!-- slide -->
![Repository View](file:///Users/dharanidharansenthilkumar/.gemini/antigravity/brain/d5509fae-a771-4411-835b-8cc4cfae48ef/uploaded_image_4_1767533713818.png)
````

---

## 🚀 Quick Start

### CLI Installation

```bash
pip install -e ./apps/cli
```

### Basic Workflow

```bash
# Initialize a repository
anchor init

# Check status
anchor status

# Commit changes
anchor commit -m "Initial commit"

# Sync with remote
anchor push
```

---

## 🌐 Public Access via SSH Tunnel

For external access without complex configuration:

1. **Start Backend**: `cd apps/backend && uvicorn main:app --port 8001`
2. **Start Frontend**: `cd apps/frontend && npm run dev`
3. **Start Tunnel**: `./scripts/start-tunnel.sh` (if available)

---

## ⚖️ License

MIT License. See [LICENSE](file:///Users/dharanidharansenthilkumar/Projects/ANCHOR/LICENSE) for details.
