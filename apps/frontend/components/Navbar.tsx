import React, { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Navbar: FC = () => {
    const router = useRouter();

    return (
        <nav className="glass" style={{
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'rgba(5, 11, 20, 0.8)',
            backdropFilter: 'blur(12px)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <Link href="/" legacyBehavior>
                    <a style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        letterSpacing: '-0.02em'
                    }}>
                        <img src="/branding/logo.png" alt="Anchor Logo" style={{ width: '32px', height: '32px' }} />
                        Anchor
                    </a>
                </Link>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '1rem', fontWeight: 600 }}>
                    <Link href="/repos" legacyBehavior>
                        <a style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>Repositories</a>
                    </Link>
                    <Link href="/terminal" legacyBehavior>
                        <a style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>Terminal</a>
                    </Link>
                    <Link href="/status" legacyBehavior>
                        <a style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>Status</a>
                    </Link>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <Link href="/profile" legacyBehavior>
                        <a style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
                                alt="avatar"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0' }}
                            />
                        </a>
                    </Link>
                </div>
                <Link href="/settings" legacyBehavior>
                    <button className="glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}>Settings</button>
                </Link>
                <button
                    onClick={() => {
                        localStorage.removeItem('anchor_token');
                        router.push('/login');
                    }}
                    style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
