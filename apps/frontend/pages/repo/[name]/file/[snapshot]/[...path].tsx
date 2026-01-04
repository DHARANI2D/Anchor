import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '../../../../../utils/api';

const FileViewPage: NextPage = () => {
    const router = useRouter()
    const { name, snapshot, path } = router.query as { name: string; snapshot: string; path: string[] }
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!name || !snapshot || !path) return

        authFetch(`/repo/${name}/file/${snapshot}/${path.join('/')}`)
            .then((r) => r.text())
            .then((data) => {
                setContent(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [name, snapshot, path])

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050b14', color: '#38bdf8' }}>Loading file content...</div>

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', color: '#f8fafc', padding: '2rem', fontFamily: '"Inter", -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <nav style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href={`/repo/${name}`} legacyBehavior>
                        <a style={{
                            color: '#38bdf8',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>←</span> Back to repository
                        </a>
                    </Link>
                </nav>

                <div className="glass" style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.4)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(12px)'
                }}>
                    <div style={{
                        padding: '1.25rem 2rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📄</span>
                            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{path?.join('/')}</h1>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem' }}>{content.length} bytes</span>
                        </div>
                    </div>

                    <div style={{ padding: '0' }}>
                        <pre style={{
                            margin: 0,
                            padding: '2rem',
                            backgroundColor: 'transparent',
                            color: '#e2e8f0',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                            overflowX: 'auto',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace'
                        }}>
                            <code>{content}</code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FileViewPage
