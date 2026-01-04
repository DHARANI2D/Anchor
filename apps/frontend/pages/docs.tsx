import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const DocsPage: NextPage = () => {
    const sections = [
        {
            title: "Platform Overview",
            content: "Anchor is a high-performance, secure version control and portfolio management system. It combines the reliability of SVCS with a modern, developer-centric interface."
        },
        {
            title: "Security Hardening",
            content: "Your data is protected by industry-standard bcrypt password hashing and intelligent rate limiting. Every login attempt is monitored to prevent unauthorized access."
        },
        {
            title: "Terminal Integration",
            content: "Take control with the Anchor CLI. Manage repositories, check system health, and authenticate securely directly from your terminal.",
            link: { text: "View Terminal Guide", href: "/terminal" }
        },
        {
            title: "SSH Authentication",
            content: "Register your public keys in settings to enable seamless, passwordless authentication for all CLI operations.",
            link: { text: "Manage SSH Keys", href: "/settings" }
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', color: '#e2e8f0', fontFamily: '"Inter", -apple-system, sans-serif', paddingBottom: '6rem' }}>
            <Head>
                <title>Anchor | Documentation</title>
            </Head>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 2rem' }}>
                <div style={{ marginBottom: '5rem' }}>
                    <h1 style={{
                        fontSize: '3.5rem',
                        fontWeight: 900,
                        background: 'linear-gradient(90deg, #38bdf8 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1.5rem',
                        letterSpacing: '-0.04em'
                    }}>
                        Documentation
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.6 }}>
                        Everything you need to know about building, managing, and securing your projects on Anchor.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '4rem' }}>
                    {sections.map((section, i) => (
                        <section key={i} style={{ position: 'relative' }} className="doc-section">
                            <div style={{ position: 'relative', zIndex: 10 }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ color: 'rgba(56, 189, 248, 0.3)', fontFamily: 'monospace', fontSize: '1rem' }}>0{i + 1}</span>
                                    {section.title}
                                </h2>
                                <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                                    {section.content}
                                </p>
                                {section.link && (
                                    <Link href={section.link.href} legacyBehavior>
                                        <a style={{
                                            color: '#38bdf8',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s',
                                            fontSize: '0.95rem'
                                        }} className="doc-link">
                                            {section.link.text}
                                            <svg style={{ width: '1.2rem', height: '1.2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </a>
                                    </Link>
                                )}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="glass" style={{
                    marginTop: '6rem',
                    padding: '3rem',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.1)',
                    borderRadius: '1.5rem',
                    backdropFilter: 'blur(12px)'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Need help?</h3>
                    <p style={{ color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                        If you encounter any issues or have questions, please reach out to our support team or check the <Link href="/terminal" legacyBehavior><a style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Terminal Guide</a></Link> for common troubleshooting steps.
                    </p>
                </div>
            </main>

            <style jsx>{`
                .doc-link:hover {
                    gap: 0.75rem !important;
                    color: #7dd3fc !important;
                }
                .doc-section::before {
                    content: '';
                    position: absolute;
                    top: -1.5rem;
                    left: -2rem;
                    right: -2rem;
                    bottom: -1.5rem;
                    background-color: rgba(255, 255, 255, 0.02);
                    border-radius: 1rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 0;
                }
                .doc-section:hover::before {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default DocsPage;
