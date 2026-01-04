import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { authFetch } from '../utils/api';
import Link from 'next/link';
import Head from 'next/head';
import StepUpModal from '../components/StepUpModal';

interface UserProfile {
    username: string;
    bio: string;
    location: string;
    website: string;
    avatar_url: string;
}

const SettingsPage: NextPage = () => {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [keys, setKeys] = useState<any[]>([]);
    const [newKey, setNewKey] = useState({ title: '', key: '' });
    const [addingKey, setAddingKey] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'add' | 'delete' | 'disable_2fa' | 'update_profile', data?: any } | null>(null);

    // 2FA State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string, qr_code: string } | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [setupStep, setSetupStep] = useState<'initial' | 'qr' | 'verify'>('initial');
    const [verifying2FA, setVerifying2FA] = useState(false);

    useEffect(() => {
        // Fetch profile
        authFetch('/user/profile')
            .then(r => r.json())
            .then(data => setProfile(data))
            .finally(() => setLoading(false));

        // Fetch keys
        authFetch('/user/keys')
            .then(r => r.json())
            .then(data => setKeys(data));

        // Fetch 2FA status
        authFetch('/user/2fa/status')
            .then(r => r.json())
            .then(data => setTwoFactorEnabled(data.enabled));
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!profile) return;
        setSaving(true);

        const updateData: any = { ...profile };
        if (newPassword) {
            updateData.new_password = newPassword;
        }

        try {
            const res = await authFetch('/user/profile', {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });
            if (res.ok) {
                if (updateData.username !== profile.username) {
                    // If username changed, we might need a log in again or update local storage
                    // For now, redirect to profile
                }
                router.push('/profile');
            } else if (res.status === 403) {
                setPendingAction({ type: 'update_profile' });
                setStepUpOpen(true);
            }
        } catch (err) {
            console.error("Failed to save profile", err);
        } finally {
            setSaving(false);
        }
    };

    const handleAddKey = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setAddingKey(true);
        try {
            const res = await authFetch('/user/keys', {
                method: 'POST',
                body: JSON.stringify(newKey)
            });
            if (res.ok) {
                const updatedKeys = await res.json();
                setKeys(updatedKeys);
                setNewKey({ title: '', key: '' });
                setPendingAction(null);
            } else if (res.status === 403) {
                setPendingAction({ type: 'add' });
                setStepUpOpen(true);
            }
        } catch (err) {
            console.error("Failed to add key", err);
        } finally {
            setAddingKey(false);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        try {
            const res = await authFetch(`/user/keys/${keyId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedKeys = await res.json();
                setKeys(updatedKeys);
                setPendingAction(null);
            } else if (res.status === 403) {
                setPendingAction({ type: 'delete', data: keyId });
                setStepUpOpen(true);
            }
        } catch (err) {
            console.error("Failed to delete key", err);
        }
    };

    const handleDisable2FA = async () => {
        try {
            const res = await authFetch('/user/2fa/disable', {
                method: 'POST'
            });
            if (res.ok) {
                setTwoFactorEnabled(false);
                setPendingAction(null);
            } else if (res.status === 403) {
                setPendingAction({ type: 'disable_2fa' });
                setStepUpOpen(true);
            }
        } catch (err) {
            console.error("Failed to disable 2FA", err);
        }
    };

    const start2FASetup = async () => {
        try {
            const res = await authFetch('/user/2fa/setup', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setTwoFactorSetup(data);
                setSetupStep('qr');
            }
        } catch (err) {
            console.error("Failed to start 2FA setup", err);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFactorSetup) return;
        setVerifying2FA(true);
        try {
            const res = await authFetch('/user/2fa/enable', {
                method: 'POST',
                body: JSON.stringify({
                    code: twoFactorCode,
                    secret: twoFactorSetup.secret
                })
            });
            if (res.ok) {
                setTwoFactorEnabled(true);
                setSetupStep('initial');
                setTwoFactorSetup(null);
                setTwoFactorCode('');
            } else {
                alert("Invalid code. Please try again.");
            }
        } catch (err) {
            console.error("Failed to verify 2FA", err);
        } finally {
            setVerifying2FA(false);
        }
    };

    const onStepUpSuccess = () => {
        setStepUpOpen(false);
        if (pendingAction?.type === 'add') {
            handleAddKey();
        } else if (pendingAction?.type === 'delete') {
            handleDeleteKey(pendingAction.data);
        } else if (pendingAction?.type === 'disable_2fa') {
            handleDisable2FA();
        } else if (pendingAction?.type === 'update_profile') {
            handleSubmit();
        }
    };

    const [activeSection, setActiveSection] = useState<'profile' | 'keys' | 'security' | 'terminal'>('profile');

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--surface)', color: 'var(--primary)', fontFamily: '"Outfit", sans-serif', fontSize: '1.2rem', fontWeight: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--glass-border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Synchronizing Anchor Settings...
        </div>
        <style jsx>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
    </div>;

    const navItemStyle = (id: string) => ({
        padding: '1rem 1.5rem',
        borderRadius: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '1rem',
        fontWeight: 700,
        transition: 'all 0.2s',
        color: activeSection === id ? 'var(--primary-light)' : 'var(--text-secondary)',
        backgroundColor: activeSection === id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        border: activeSection === id ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontFamily: '"Outfit", sans-serif' }}>
            <Head>
                <title>Anchor | Settings</title>
            </Head>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem', display: 'flex', gap: '4rem' }}>
                {/* Sidebar Navigation */}
                <aside style={{ width: '280px', flexShrink: 0 }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-light)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Configuration</span>
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div onClick={() => setActiveSection('profile')} style={navItemStyle('profile')} onMouseOver={e => activeSection !== 'profile' && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')} onMouseOut={e => activeSection !== 'profile' && (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <span>👤</span> Public Persona
                        </div>
                        <div onClick={() => setActiveSection('keys')} style={navItemStyle('keys')} onMouseOver={e => activeSection !== 'keys' && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')} onMouseOut={e => activeSection !== 'keys' && (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <span>🔑</span> SSH Security Keys
                        </div>
                        <div onClick={() => setActiveSection('security')} style={navItemStyle('security')} onMouseOver={e => activeSection !== 'security' && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')} onMouseOut={e => activeSection !== 'security' && (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <span>🛡️</span> Dual-Phase Guard
                        </div>
                        <div onClick={() => setActiveSection('terminal')} style={navItemStyle('terminal')} onMouseOver={e => activeSection !== 'terminal' && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')} onMouseOut={e => activeSection !== 'terminal' && (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <span>💻</span> Host Configuration
                        </div>
                    </nav>

                    <div style={{ marginTop: '5rem', padding: '1.5rem', borderRadius: '1.5rem', backgroundColor: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
                            Need assistance with your neural link? <Link href="/docs" legacyBehavior><a style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 700 }}>Visit Core Docs →</a></Link>
                        </p>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main style={{ flex: 1, minWidth: 0 }}>
                    {activeSection === 'profile' && (
                        <section>
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Public Persona</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Manage how you appear across the Anchor network.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Public Identity (Username)</label>
                                        <input
                                            type="text"
                                            value={profile?.username}
                                            onChange={e => setProfile(p => p ? { ...p, username: e.target.value } : null)}
                                            className="styled-input"
                                            placeholder="new_username"
                                        />
                                        <p style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.5rem', fontWeight: 600 }}>⚠️ RENAME: Requires re-authentication</p>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>New Access Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="styled-input"
                                            placeholder="Leave blank to keep current"
                                        />
                                        <p style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.5rem', fontWeight: 600 }}>⚠️ CHANGE: Requires re-authentication</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Identity Bio</label>
                                    <textarea
                                        value={profile?.bio}
                                        onChange={e => setProfile(p => p ? { ...p, bio: e.target.value } : null)}
                                        className="styled-input"
                                        style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                                        placeholder="Describe your technical focus..."
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Sector</label>
                                        <input
                                            type="text"
                                            value={profile?.location}
                                            onChange={e => setProfile(p => p ? { ...p, location: e.target.value } : null)}
                                            className="styled-input"
                                            placeholder="e.g. San Francisco, Neo-Tokyo"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Digital Link</label>
                                        <input
                                            type="url"
                                            value={profile?.website}
                                            onChange={e => setProfile(p => p ? { ...p, website: e.target.value } : null)}
                                            className="styled-input"
                                            placeholder="https://yourdomain.com"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <button type="submit" disabled={saving} className="primary-button" style={{ padding: '1rem 2.5rem' }}>
                                        {saving ? 'Syncing...' : 'Update Persona'}
                                    </button>
                                    <button type="button" onClick={() => router.push('/profile')} className="secondary-button" style={{ padding: '1rem 2.5rem' }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {activeSection === 'keys' && (
                        <section>
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Security Keys (SSH)</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Safeguard your neural push/pull operations with cryptographic keypairs.</p>
                            </div>

                            <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem', marginBottom: '3rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '2rem' }}>Register Secure Key</h3>
                                <form onSubmit={handleAddKey}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Key Designation</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Primary Workstation (Encrypted)"
                                            value={newKey.title}
                                            onChange={e => setNewKey({ ...newKey, title: e.target.value })}
                                            className="styled-input"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Public Payload</label>
                                        <textarea
                                            placeholder="Paste public key starting with ssh-rsa or ssh-ed25519..."
                                            value={newKey.key}
                                            onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                                            className="styled-input"
                                            style={{ minHeight: '100px', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <button type="submit" disabled={addingKey || !newKey.title || !newKey.key} className="primary-button" style={{ padding: '1rem 2.5rem' }}>
                                        {addingKey ? 'Authorizing...' : 'Add Key to Vault'}
                                    </button>
                                </form>
                            </div>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '1rem 0 0.5rem 0' }}>Authorized Keys</h3>
                                {keys.length === 0 ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '1.5rem', border: '1px dashed var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        No security keys active in this vault.
                                    </div>
                                ) : (
                                    keys.map(key => (
                                        <div key={key.id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderRadius: '1.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{key.title}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontFamily: '"JetBrains Mono", monospace', opacity: 0.7 }}>{key.id.toUpperCase()} • {key.key.substring(0, 30)}...</div>
                                            </div>
                                            <button onClick={() => handleDeleteKey(key.id)} style={{ color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>Revoke</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}

                    {activeSection === 'security' && (
                        <section>
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Dual-Phase Guard (2FA)</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Establish a secondary validation channel via the Anchor mobile application.</p>
                            </div>

                            <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Authenticator Shield</div>
                                    <div style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 900, backgroundColor: twoFactorEnabled ? 'rgba(45, 212, 191, 0.1)' : 'rgba(248, 113, 113, 0.1)', color: twoFactorEnabled ? 'var(--secondary)' : '#f87171', border: '1px solid currentColor', letterSpacing: '0.05em' }}>
                                        {twoFactorEnabled ? 'ACTIVE' : 'INACTIVE'}
                                    </div>
                                </div>

                                {twoFactorEnabled ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <button onClick={handleDisable2FA} className="secondary-button" style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', padding: '1rem 2rem' }}>Deactivate Guard</button>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Your account is in high-security mode.</p>
                                    </div>
                                ) : (
                                    setupStep === 'initial' ? (
                                        <button onClick={start2FASetup} className="primary-button" style={{ padding: '1rem 2rem' }}>Initiate Guard Links →</button>
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            {setupStep === 'qr' && twoFactorSetup && (
                                                <div>
                                                    <div style={{ backgroundColor: 'white', padding: '1.5rem', display: 'inline-block', borderRadius: '1.5rem', marginBottom: '2rem' }}>
                                                        <img src={twoFactorSetup.qr_code} alt="QR" style={{ display: 'block', width: '200px' }} />
                                                    </div>
                                                    <div style={{ marginBottom: '2rem' }}>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700 }}>TACTICAL KEY:</p>
                                                        <code style={{ fontSize: '1.2rem', letterSpacing: '0.1em', color: 'var(--primary-light)' }}>{twoFactorSetup.secret}</code>
                                                    </div>
                                                    <button onClick={() => setSetupStep('verify')} className="primary-button" style={{ padding: '1rem 3rem' }}>Enter Sync Code</button>
                                                </div>
                                            )}
                                            {setupStep === 'verify' && (
                                                <form onSubmit={handleVerify2FA} style={{ maxWidth: '300px', margin: '0 auto' }}>
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        placeholder="000000"
                                                        value={twoFactorCode}
                                                        onChange={e => setTwoFactorCode(e.target.value)}
                                                        className="styled-input"
                                                        style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.2em', marginBottom: '2rem' }}
                                                    />
                                                    <button type="submit" disabled={verifying2FA} className="primary-button" style={{ width: '100%', padding: '1rem' }}>{verifying2FA ? 'Verifying...' : 'Establish Link'}</button>
                                                </form>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </section>
                    )}

                    {activeSection === 'terminal' && (
                        <section>
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Host Configuration</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Inject this manifest into your local terminal environment.</p>
                            </div>

                            <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                                <pre style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '1.5rem', color: 'var(--primary-light)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.95rem', overflowX: 'auto', border: '1px solid var(--glass-border)' }}>
                                    {`Host anchor.core
    HostName node.anchor.local
    User ${profile?.username || 'admin'}
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    ForwardAgent yes`}
                                </pre>
                                <button
                                    onClick={() => {
                                        const config = `Host anchor.core\n    HostName node.anchor.local\n    User ${profile?.username || 'admin'}\n    Port 22\n    IdentityFile ~/.ssh/id_ed25519\n    ForwardAgent yes`;
                                        navigator.clipboard.writeText(config);
                                        alert('Manifest copied.');
                                    }}
                                    className="secondary-button"
                                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
                                >
                                    Copy Manifest
                                </button>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            <StepUpModal
                isOpen={stepUpOpen}
                onSuccess={onStepUpSuccess}
                onCancel={() => {
                    setStepUpOpen(false);
                    setPendingAction(null);
                }}
            />

            <style jsx global>{`
                .styled-input { width: 100%; padding: 1rem 1.5rem; border-radius: 1rem; border: 1px solid var(--glass-border); background-color: rgba(15, 23, 42, 0.4); color: var(--text-primary); font-size: 1rem; outline: none; transition: all 0.2s; }
                .styled-input:focus { border-color: var(--primary); background-color: rgba(15, 23, 42, 0.6); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
                .primary-button { background-color: var(--primary); color: white; border: none; border-radius: 1.25rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                .primary-button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); }
                .primary-button:disabled { opacity: 0.5; }
                .secondary-button { background-color: transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); border-radius: 1.25rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .secondary-button:hover { background-color: rgba(255,255,255,0.05); color: var(--text-primary); }
            `}</style>
        </div>
    );
};

export default SettingsPage;
