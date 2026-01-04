import React, { FC } from 'react';

interface Commit {
    snapshot_id: string;
    parent: string | null;
    message: string;
    timestamp: string;
    root_tree: string;
}

interface CommitListProps {
    commits: Commit[];
}

const CommitList: FC<CommitListProps> = ({ commits }) => {

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return iso;
        }
    };

    return (
        <div style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', paddingBottom: '1rem' }}>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>Description</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>Snapshot</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, letterSpacing: '0.05em' }}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {commits.map((commit) => (
                        <tr key={commit.snapshot_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'all 0.2s' }} className="anchor-row">
                            <td style={{ padding: '1.25rem 1.5rem', width: '60%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.1rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
                                        📦
                                    </span>
                                    <div>
                                        <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{commit.message}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Parent: {commit.parent ? commit.parent.substring(0, 10) : 'None'}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#38bdf8', width: '20%', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem' }}>
                                {commit.snapshot_id}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', textAlign: 'right', width: '20%', fontSize: '0.8rem', fontWeight: 500 }}>
                                {formatDate(commit.timestamp)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {(commits.length === 0) && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No history available.
                </div>
            )}
            <style jsx>{`
                .anchor-row:hover {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                .anchor-row:last-child {
                    border-bottom: none;
                }
            `}</style>
        </div>
    );
};

export default CommitList;
