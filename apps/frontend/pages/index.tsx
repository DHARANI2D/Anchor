import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { authFetch } from '../utils/api';

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

const IndexPage: NextPage = () => {
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050b14', color: '#38bdf8' }}>
            Loading Anchor Profile...
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', paddingBottom: '4rem', color: '#f8fafc', fontFamily: '"Inter", -apple-system, sans-serif' }}>
            <Head>
                <title>Anchor | {profile?.username || 'Profile'}</title>
            </Head>

            <div style={{ background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0) 100%)', borderBottom: '1px solid var(--glass-border)', padding: '5rem 2rem', marginBottom: '3rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div style={{ position: 'relative' }}>
                        <img
                            src={profile?.avatar_url}
                            alt="avatar"
                            style={{
                                width: '140px',
                                height: '140px',
                                borderRadius: '2.5rem',
                                border: '4px solid rgba(99, 102, 241, 0.2)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                objectFit: 'cover'
                            }}
                        />
                        <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '28px', height: '28px', backgroundColor: '#10b981', borderRadius: '50%', border: '4px solid var(--surface)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}></div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>{profile?.username}</h1>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0', maxWidth: '700px', lineHeight: 1.6, fontWeight: 500 }}>{profile?.bio}</p>
                        <div style={{ display: 'flex', gap: '2rem', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>📍 {profile?.location}</span>
                            {profile?.website && (
                                <a href={profile.website} style={{ color: 'var(--primary-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>🔗 {profile.website}</a>
                            )}
                        </div>
                    </div>
                    {profile?.username === 'admin' && (
                        <div>
                            <Link href="/settings" legacyBehavior>
                                <a className="glass" style={{
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--primary-light)',
                                    padding: '1rem 2rem',
                                    borderRadius: '1rem',
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'inline-block'
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
                        </div>
                    )}
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '3rem', gap: '4rem' }}>
                    <a style={{ padding: '1.25rem 0', borderBottom: '3px solid var(--primary)', fontWeight: 800, color: 'var(--primary)', textDecoration: 'none', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Repositories <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>{repos.length}</span>
                    </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2.5rem' }}>
                    {repos.map(repo => (
                        <Link key={repo.name} href={`/repo/${repo.name}`} legacyBehavior>
                            <a style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="glass-card" style={{
                                    padding: '2.5rem',
                                    borderRadius: '1.5rem',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.6)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{repo.name}</h3>
                                    </div>
                                    <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.7, flex: 1, fontWeight: 400 }}>
                                        {repo.description || "A high-performance repository managed by Anchor SVCS."}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--secondary)', boxShadow: '0 0 10px rgba(45, 212, 191, 0.5)' }}></span> TypeScript
                                            </span>
                                            <span>Updated 2 days ago</span>
                                        </div>
                                        <span style={{ color: 'var(--primary-light)', fontWeight: 800 }}>Explore →</span>
                                    </div>
                                </div>
                            </a>
                        </Link>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .glass:hover {
                    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.4);
                }
            `}</style>
        </div >
    );
};

export default IndexPage;
