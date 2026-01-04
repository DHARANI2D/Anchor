import React, { FC } from 'react';
import Link from 'next/link';

const Footer: FC = () => {
    return (
        <footer style={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--glass-border)',
            padding: '2rem 2rem',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem' }}>
                    <img src="/branding/logo.png" alt="Anchor Logo" style={{ width: '28px', height: '28px' }} />
                    Anchor
                </div>
                <div style={{ fontWeight: 500, opacity: 0.8 }}>© 2026 Anchor. Built for the future of secure version control.</div>
                <div style={{ display: 'flex', gap: '3rem' }}>
                    <Link href="/docs" legacyBehavior><a style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 600 }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>Docs</a></Link>
                    <Link href="/settings" legacyBehavior><a style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 600 }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>Settings</a></Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
