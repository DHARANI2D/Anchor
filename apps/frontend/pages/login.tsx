import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '../config';

const LoginPage: NextPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [is2FARequired, setIs2FARequired] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const api_url = `${API_BASE_URL}/auth/login`;
            console.log('Attempting login at:', api_url);

            const res = await fetch(api_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await res.json();
            if (res.ok) {
                if (data.status === '2fa_required') {
                    setIs2FARequired(true);
                } else {
                    localStorage.setItem('anchor_token', data.access_token);
                    router.push('/');
                }
            } else {
                console.warn('Login failed:', data);
                setError(data.detail || 'Invalid credentials');
            }
        } catch (err) {
            console.error('Connection error:', err);
            setError('Failed to connect to secure server. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login/2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, code: twoFactorCode }),
                credentials: 'include'
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('anchor_token', data.access_token);
                router.push('/');
            } else {
                setError(data.detail || 'Invalid 2FA code');
            }
        } catch (err) {
            setError('Verification node unreachable');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface)',
            fontFamily: '"Outfit", sans-serif',
            background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, var(--surface) 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'var(--secondary)', filter: 'blur(150px)', opacity: 0.1, pointerEvents: 'none' }}></div>

            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '450px',
                height: 'calc(100vh - 4rem)',
                margin: '2rem 0',
                padding: '2.5rem 4rem',
                borderRadius: '3rem',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}>
                <div style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'inline-block', position: 'relative', marginBottom: '1rem' }}>
                            <div style={{ position: 'absolute', inset: -5, background: 'var(--primary)', borderRadius: '2rem', filter: 'blur(20px)', opacity: 0.3 }}></div>
                            <img src="/branding/logo.png" alt="Anchor" style={{ width: '80px', height: '80px', position: 'relative' }} />
                        </div>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>ANCHOR</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem', fontWeight: 600, letterSpacing: '0.01em' }}>Secure Version Control System</p>
                    </div>

                    {!is2FARequired ? (
                        <form onSubmit={handleLogin}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 900, marginBottom: '0.8rem', letterSpacing: '0.1em' }}>USERNAME</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="login-input"
                                    placeholder="Enter username..."
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 900, marginBottom: '0.8rem', letterSpacing: '0.1em' }}>PASSWORD</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="login-input"
                                    placeholder="••••••••••••"
                                />
                            </div>

                            {error && (
                                <div className="error-alert">
                                    <span style={{ marginRight: '0.75rem' }}>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-button"
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                        <div className="spinner"></div>
                                        <span>AUTHENTICATING...</span>
                                    </div>
                                ) : 'LOGIN'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handle2FAVerify}>
                            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--secondary)', boxShadow: '0 0 10px var(--secondary)' }}></div>
                                    <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Two-Factor Authentication</h2>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500, lineHeight: 1.6 }}>Enter the 6-digit code from your authenticator app.</p>
                            </div>

                            <div style={{ marginBottom: '3rem' }}>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="••••••"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                    required
                                    autoFocus
                                    className="login-input"
                                    style={{ fontSize: '2.5rem', textAlign: 'center', letterSpacing: '0.4em', height: 'auto', padding: '1.5rem' }}
                                />
                            </div>

                            {error && (
                                <div className="error-alert">
                                    <span style={{ marginRight: '0.75rem' }}>❌</span>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || twoFactorCode.length !== 6}
                                className="login-button"
                                style={{ backgroundColor: 'var(--secondary)', color: 'var(--surface)', boxShadow: '0 10px 25px rgba(45, 212, 191, 0.3)' }}
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                        <div className="spinner" style={{ borderTopColor: 'var(--surface)' }}></div>
                                        <span>VERIFYING...</span>
                                    </div>
                                ) : 'VERIFY'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIs2FARequired(false)}
                                style={{
                                    width: '100%',
                                    marginTop: '1.5rem',
                                    padding: '0.75rem',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    textDecoration: 'none',
                                    opacity: 0.6
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseOut={(e) => (e.currentTarget.style.opacity = '0.6')}
                            >
                                ← Return to Login
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.1em', opacity: 0.4 }}>
                        ANCHOR SVCS v1.0.0
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .login-input {
                    width: 100%;
                    padding: 1.25rem 1.75rem;
                    border-radius: 1.5rem;
                    border: 1px solid var(--glass-border);
                    background-color: rgba(15, 23, 42, 0.4);
                    color: var(--text-primary);
                    font-size: 1.1rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-family: inherit;
                }
                .login-input:focus {
                    border-color: var(--primary);
                    background-color: rgba(15, 23, 42, 0.6);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
                    transform: translateY(-2px);
                }
                .login-button {
                    width: 100%;
                    padding: 1.25rem;
                    border-radius: 1.5rem;
                    border: none;
                    background-color: var(--primary);
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 900;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
                    letter-spacing: 0.05em;
                }
                .login-button:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
                }
                .login-button:active:not(:disabled) {
                    transform: translateY(-1px);
                }
                .login-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .error-alert {
                    background-color: rgba(248, 113, 113, 0.1);
                    border: 1px solid rgba(248, 113, 113, 0.2);
                    color: #fca5a5;
                    padding: 1.25rem;
                    border-radius: 1.25rem;
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin-bottom: 2.5rem;
                    text-align: center;
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
