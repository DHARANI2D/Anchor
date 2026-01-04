import React, { useEffect, useState, FC } from 'react';
import { authFetch } from '../utils/api';

interface ReadmeViewerProps {
    repoName: string;
    snapshotId: string;
    readmePath: string | null;
}

const ReadmeViewer: FC<ReadmeViewerProps> = ({ repoName, snapshotId, readmePath }) => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!readmePath) return;
        setLoading(true);

        authFetch(`/repo/${repoName}/readme`)
            .then(r => r.text())
            .then(text => setContent(text))
            .catch(err => console.error("Failed to fetch README", err))
            .finally(() => setLoading(false));
    }, [repoName, snapshotId, readmePath]);

    if (!readmePath) return null;

    return (
        <div className="glass" style={{
            marginTop: '2rem',
            padding: '2.5rem',
            borderRadius: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(12px)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '1.25rem',
                marginBottom: '2rem'
            }}>
                <span style={{ marginRight: '1rem', fontSize: '1.5rem' }}>📖</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>README.md</h3>
            </div>
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8' }}>
                    <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%' }}></div>
                    <span>Loading Documentation...</span>
                </div>
            ) : (
                <div style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    color: '#e2e8f0',
                    lineHeight: 1.7,
                    fontSize: '1rem'
                }}>
                    {content || "No documentation found for this repository."}
                </div>
            )}
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .spinner {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default ReadmeViewer;
