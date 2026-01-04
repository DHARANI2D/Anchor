import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { authFetch } from '../utils/api';
import { useRouter } from 'next/router';

interface UserProfile {
    username: string;
    bio: string;
    location: string;
    website: string;
    avatar_url: string;
}

interface Repo {
    name: string;
    description?: string;
}

const ProfilePage: NextPage = () => {
    const router = useRouter();
    const { tab = 'repositories' } = router.query;
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch profile
        authFetch('/user/profile')
            .then(r => r.json())
            .then(data => setProfile(data));

        // Fetch repos
        authFetch('/repos')
            .then(r => r.json())
            .then(data => setRepos(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--surface)', color: 'var(--primary)' }}>
            <div style={{ textAlign: 'center' }}>
                <img src="/branding/logo.png" alt="Anchor" style={{ width: '60px', height: '60px', marginBottom: '1rem', animation: 'pulse 2s infinite' }} />
                <div style={{ fontWeight: 700, letterSpacing: '0.05em' }}>LOADING ANCHOR...</div>
            </div>
            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', padding: '5rem 2rem', fontFamily: '"Outfit", -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4rem' }}>
                {/* Left Sidebar: Profile Info */}
                <aside style={{ width: '340px' }}>
                    <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                        <img
                            src={profile?.avatar_url}
                            alt="avatar"
                            style={{
                                width: '100%',
                                borderRadius: '2.5rem',
                                border: '4px solid rgba(99, 102, 241, 0.2)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                objectFit: 'cover'
                            }}
                        />
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '32px', height: '32px', backgroundColor: '#10b981', borderRadius: '50%', border: '4px solid var(--surface)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}></div>
                    </div>

                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.75rem 0', letterSpacing: '-0.04em' }}>{profile?.username}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.7, fontWeight: 500 }}>{profile?.bio}</p>

                    <Link href="/settings" legacyBehavior>
                        <a className="glass" style={{
                            display: 'block',
                            width: '100%',
                            padding: '1rem',
                            textAlign: 'center',
                            fontWeight: 800,
                            marginBottom: '2.5rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--primary-light)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '1rem',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                            }}>
                            Edit Profile
                        </a>
                    </Link>

                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ opacity: 0.8 }}>📍</span> {profile?.location}
                        </div>
                        {profile?.website && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ opacity: 0.8 }}>🔗</span>
                                <a href={profile.website} style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 700 }}>{profile.website.replace(/^https?:\/\//, '')}</a>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content: Sections */}
                <main style={{ flex: 1 }}>
                    <nav style={{ borderBottom: '1px solid var(--glass-border)', marginBottom: '3rem', display: 'flex', gap: '3.5rem' }}>
                        <a
                            style={{
                                padding: '1.25rem 0',
                                borderBottom: '3px solid var(--primary)',
                                fontWeight: 800,
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'default',
                                transition: 'all 0.2s'
                            }}
                        >
                            Repositories <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>{repos.length}</span>
                        </a>
                    </nav>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {repos.length > 0 ? (
                            repos.map(repo => (
                                <div key={repo.name} className="glass-card" style={{
                                    padding: '2.5rem',
                                    borderRadius: '1.5rem',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'default'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.5)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <Link href={`/repo/${repo.name}`} legacyBehavior>
                                                <a style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '-0.02em' }} className="repo-link">{repo.name}</a>
                                            </Link>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.75rem', lineHeight: 1.7, fontWeight: 400 }}>{repo.description || "A high-performance repository managed by Anchor SVCS."}</p>
                                            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--secondary)', boxShadow: '0 0 10px rgba(45, 212, 191, 0.5)' }}></span> TypeScript
                                                </span>
                                                <span>Updated 2 days ago</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2.5rem', border: '2px dashed var(--glass-border)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📦</div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Repositories</h3>
                                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>You haven't initialized any Anchor vaults yet.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <style jsx>{`
                .repo-link:hover {
                    color: var(--primary-light) !important;
                }
            `}</style>
        </div>
    );
};

export default ProfilePage;
