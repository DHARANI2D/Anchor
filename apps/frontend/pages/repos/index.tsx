import type { NextPage } from 'next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router';
import Link from 'next/link'
import { authFetch } from '../../utils/api';

interface Repo {
    name: string;
    is_public?: boolean;
    is_favorite?: boolean;
}

const ReposPage: NextPage = () => {
    const [repos, setRepos] = useState<Repo[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRepos();
    }, [])

    const fetchRepos = () => {
        authFetch('/repos')
            .then((res) => res.json())
            .then((data) => {
                setRepos(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    const toggleFavorite = async (e: React.MouseEvent, repoName: string, currentStatus: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await authFetch(`/repos/${repoName}/favorite?is_favorite=${!currentStatus}`, {
                method: 'PATCH'
            });
            if (response.ok) {
                // Optimistic update
                setRepos(prevRepos => prevRepos.map(r =>
                    r.name === repoName ? { ...r, is_favorite: !currentStatus } : r
                ));
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050b14', color: '#38bdf8' }}>Loading Anchor Core...</div>

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', paddingBottom: '4rem', color: '#f8fafc' }}>
            <div style={{ background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0) 100%)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '4rem 2rem', marginBottom: '3rem' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Repositories</h1>
                        <p style={{ fontSize: '1.1rem', color: '#94a3b8', margin: 0 }}>Explore and manage your versioned projects.</p>
                    </div>
                    <Link href="/repos/new" legacyBehavior>
                        <a style={{
                            backgroundColor: '#38bdf8',
                            color: '#0f172a',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                        }}>
                            + New Repository
                        </a>
                    </Link>
                </div>
            </div>

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {repos.map((repo) => (
                        <Link key={repo.name} href={`/repo/${repo.name}`} legacyBehavior>
                            <a style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="glass" style={{
                                    padding: '1.5rem',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    backgroundColor: 'rgba(30, 41, 59, 0.4)',
                                    backdropFilter: 'blur(8px)',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    height: '100%'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>📁</span>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{repo.name}</h3>
                                        </div>
                                        <button
                                            onClick={(e) => toggleFavorite(e, repo.name, !!repo.is_favorite)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                fontSize: '1.25rem',
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                filter: repo.is_favorite ? 'drop-shadow(0 0 8px #f59e0b)' : 'grayscale(1) opacity(0.3)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            {repo.is_favorite ? '⭐' : '☆'}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                        A high-performance repository managed by Anchor SVCS.
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Production</span>
                                            {repo.is_public && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    color: '#22c55e',
                                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '1rem',
                                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                                    fontWeight: 700
                                                }}>🌐 PUBLIC</span>
                                            )}
                                        </div>
                                        <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem' }}>View Details →</span>
                                    </div>
                                </div>
                            </a>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ReposPage
