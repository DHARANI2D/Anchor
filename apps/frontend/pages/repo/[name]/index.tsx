import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import FileTable from '../../../components/FileTable'
import ReadmeViewer from '../../../components/ReadmeViewer'
import CommitList from '../../../components/CommitList'
import { authFetch } from '../../../utils/api';

interface RepoMeta {
    name: string
}

interface TreeNode {
    entries: Record<string, { type: string; id: string }>
}

interface Commit {
    snapshot_id: string;
    parent: string | null;
    message: string;
    timestamp: string;
    root_tree: string;
}

const RepoDetailPage: NextPage = () => {
    const router = useRouter()
    const { name } = router.query as { name: string }
    const [meta, setMeta] = useState<RepoMeta | null>(null)
    const [tree, setTree] = useState<TreeNode | null>(null)
    const [history, setHistory] = useState<Commit[]>([])
    const [snapshotId, setSnapshotId] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showClone, setShowClone] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [activeTab, setActiveTab] = useState('Code')
    const [shareLink, setShareLink] = useState<string | null>(null)
    const [isPublic, setIsPublic] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)

    const [user, setUser] = useState<{ username: string } | null>(null);

    useEffect(() => {
        if (!name) return

        // Fetch user info for permission checks
        authFetch('/user/profile')
            .then(r => r.json())
            .then(data => setUser(data))
            .catch(() => console.error("Failed to fetch profile"));

        authFetch(`/repos/${name}`)
            .then((r) => r.json())
            .then((data) => {
                setMeta(data)
                setIsPublic(data.is_public || false)
                setIsFavorite(data.is_favorite || false)
                if (data.share_token) {
                    setShareLink(`${window.location.origin}/share/${data.share_token}`)
                }
            })

        authFetch(`/repos/${name}/history`)
            .then((r) => r.json())
            .then((list) => {
                setHistory(list);
                const latest = list[0]?.snapshot_id || ''
                setSnapshotId(latest)
                if (latest) {
                    return authFetch(`/repos/${name}/tree/${latest}`)
                }
            })
            .then((r) => r?.json())
            .then((treeData) => {
                setTree(treeData as TreeNode)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [name])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050b14', color: '#38bdf8' }}>Loading Anchor Core...</div>

    const readmeKey = tree ? Object.keys(tree.entries).find(k => k.toLowerCase() === 'readme.md') : null;

    const tabs = [
        { name: 'Code', icon: '📁' },
        { name: 'History', icon: '🕒' },
        ...(user?.username === 'admin' ? [{ name: 'Settings', icon: '⚙️' }] : []),
    ];

    const copyClone = () => {
        navigator.clipboard.writeText(`anchor clone http://localhost:8001/repos/${name}`);
    };

    const toggleFavorite = async () => {
        try {
            const response = await authFetch(`/repos/${name}/favorite?is_favorite=${!isFavorite}`, {
                method: 'PATCH'
            });
            if (response.ok) {
                setIsFavorite(!isFavorite);
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', color: '#f8fafc', fontFamily: '"Inter", -apple-system, sans-serif' }}>
            {/* Custom Anchor Header */}
            <div style={{ background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0) 100%)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '4rem 2rem 0 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ width: '56px', height: '56px', backgroundColor: '#38bdf8', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)' }}>⚓</div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                                    <Link href="/repos" legacyBehavior><a style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>repositories</a></Link>
                                    <span>/</span>
                                </div>
                                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>{name}</h1>
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                color: isPublic ? '#22c55e' : '#38bdf8',
                                backgroundColor: isPublic ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '2rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                border: isPublic ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(56, 189, 248, 0.2)',
                                marginLeft: '0.5rem'
                            }}>
                                {isPublic ? '🌐 Public' : '🔒 Private'}
                            </span>
                            <button
                                onClick={toggleFavorite}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.75rem',
                                    cursor: 'pointer',
                                    padding: '0 0.5rem',
                                    filter: isFavorite ? 'drop-shadow(0 0 10px #f59e0b)' : 'grayscale(1) opacity(0.4)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    marginLeft: '1rem'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2) rotate(15deg)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                {isFavorite ? '⭐' : '☆'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="anchor-btn-primary" onClick={() => setShowClone(!showClone)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem' }}>
                                <span>Clone Repository</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>▼</span>
                            </button>
                            {isPublic && (
                                <button
                                    onClick={() => {
                                        const publicUrl = `${window.location.origin}/public/${name}`;
                                        navigator.clipboard.writeText(publicUrl);
                                        alert('Public repository link copied to clipboard!');
                                    }}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        color: '#22c55e',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <span>🔗</span> Share
                                </button>
                            )}
                            {/* Header status badge above now handles visibility display */}
                        </div>
                    </div>

                    {/* Integrated Navigation */}
                    <nav style={{ display: 'flex', gap: '2.5rem' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1.25rem 0',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '1rem',
                                    color: activeTab === tab.name ? '#38bdf8' : '#64748b',
                                    borderBottom: activeTab === tab.name ? '3px solid #38bdf8' : '3px solid transparent',
                                    fontWeight: activeTab === tab.name ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: activeTab === tab.name ? 1 : 0.8
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 2rem' }}>
                {showClone && (
                    <div className="glass" style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginBottom: '3rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Clone via CLI</h4>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input readOnly value={`anchor clone http://localhost:8001/repos/${name}`} style={{ flex: 1, padding: '1rem', fontSize: '0.95rem', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', fontFamily: '"JetBrains Mono", monospace' }} />
                            <button onClick={copyClone} style={{ padding: '0 2rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>Copy</button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '3rem', alignItems: 'start' }}>
                    {/* Main Content Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                        {activeTab === 'Code' && (
                            <>
                                {/* File Explorer Card */}
                                <div className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                                    <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>🌿</span>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>main</span>
                                        </div>
                                        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}><b style={{ color: '#f8fafc' }}>{history.length}</b> snapshot{history.length !== 1 && 's'}</span>
                                    </div>
                                    <div style={{ padding: '1rem' }}>
                                        {tree && <FileTable repoName={name} snapshotId={snapshotId} entries={tree.entries} />}
                                    </div>
                                </div>

                                {/* Readme Card */}
                                {readmeKey && (
                                    <div className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                                        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>📖</span>
                                            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#cbd5e1' }}>DOCUMENTATION</h2>
                                        </div>
                                        <div style={{ padding: '3rem' }}>
                                            <ReadmeViewer repoName={name} snapshotId={snapshotId} readmePath={readmeKey} />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'History' && (
                            <div className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                                <CommitList commits={history} />
                            </div>
                        )}

                        {activeTab === 'Settings' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Visibility Section */}
                                <div className="glass" style={{
                                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.3))',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    backdropFilter: 'blur(16px)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🔓</span>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Repository Visibility</h3>
                                    </div>
                                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                        Control who can access this repository. Public repositories can be viewed by anyone without authentication.
                                    </p>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1.5rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '1.25rem' }}>{isPublic ? '🌐' : '🔒'}</span>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                                                    {isPublic ? 'Public' : 'Private'}
                                                </span>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '1rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    backgroundColor: isPublic ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                    color: isPublic ? '#22c55e' : '#64748b',
                                                    border: isPublic ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
                                                }}>
                                                    {isPublic ? 'ACTIVE' : 'ACTIVE'}
                                                </span>
                                            </div>
                                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                                                {isPublic
                                                    ? 'Anyone can view this repository without signing in'
                                                    : 'Only authenticated users can access this repository'}
                                            </p>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                const newStatus = !isPublic;
                                                try {
                                                    const response = await authFetch(`/repos/${name}/visibility?is_public=${newStatus}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' }
                                                    });

                                                    if (response.ok) {
                                                        setIsPublic(newStatus);
                                                        alert(`Repository is now ${newStatus ? 'public' : 'private'}`);
                                                    } else {
                                                        const errorData = await response.json();
                                                        alert(`Failed to update visibility: ${errorData.detail || 'Unknown error'}`);
                                                    }
                                                } catch (err) {
                                                    console.error('Visibility update error:', err);
                                                    alert('Failed to update visibility due to a connection error.');
                                                }
                                            }}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                borderRadius: '0.5rem',
                                                border: 'none',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                backgroundColor: isPublic ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                color: isPublic ? '#ef4444' : '#22c55e',
                                                fontSize: '0.95rem'
                                            }}
                                        >
                                            {isPublic ? '🔒 Make Private' : '🌐 Make Public'}
                                        </button>
                                    </div>

                                    {isPublic && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '1rem',
                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                            borderRadius: '0.5rem'
                                        }}>
                                            <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>ℹ️</span>
                                                <span>This repository is publicly accessible at: <a href={`/public/${name}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'underline', fontWeight: 700 }}>{window.location.origin}/public/{name}</a></span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}

                    </div>

                    {/* Integrated Sidebar (Command Cheatsheet) */}
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(8px)' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.25rem' }}>Quick Reference</h3>

                            <div className="cmd-section">
                                <h4>📁 Setup</h4>
                                <code>anchor init</code>
                                <code>anchor clone &lt;url&gt;</code>
                            </div>

                            <div className="cmd-section">
                                <h4>📄 Tracking</h4>
                                <code>anchor status</code>
                                <code>anchor add &lt;file&gt;</code>
                            </div>

                            <div className="cmd-section">
                                <h4>💾 Commits</h4>
                                <code>anchor commit -m "msg"</code>
                            </div>

                            <div className="cmd-section">
                                <h4>🌍 Sync</h4>
                                <code>anchor push</code>
                                <code>anchor pull</code>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <style jsx>{`
                .anchor-btn-primary {
                    background-color: #38bdf8;
                    color: #0f172a;
                    border: none;
                    padding: 0.6rem 1.5rem;
                    border-radius: 0.75rem;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
                }
                .anchor-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(56, 189, 248, 0.3);
                }
                .cmd-section {
                    margin-bottom: 1.5rem;
                }
                .cmd-section:last-child {
                    margin-bottom: 0;
                }
                .cmd-section h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.8rem;
                    color: #cbd5e1;
                    font-weight: 700;
                }
                .cmd-section code {
                    display: block;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    background: rgba(0,0,0,0.2);
                    padding: 0.4rem 0.6rem;
                    border-radius: 4px;
                    margin-bottom: 0.4rem;
                }
            `}</style>
        </div >
    )
}

export default RepoDetailPage
