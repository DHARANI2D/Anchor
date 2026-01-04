import React, { FC } from 'react';
import Link from 'next/link';

interface TreeEntry {
    type: string;
    id: string;
}

interface FileTableProps {
    repoName: string;
    snapshotId: string;
    entries: Record<string, TreeEntry>;
}

const FileTable: FC<FileTableProps> = ({ repoName, snapshotId, entries }) => {
    // Sort entries: directories first, then files, both alphabetically
    const sortedEntries = Object.entries(entries).sort(([aName, aMeta], [bName, bMeta]) => {
        if (aMeta.type !== bMeta.type) return aMeta.type === 'tree' ? -1 : 1;
        return aName.localeCompare(bName);
    });

    return (
        <div style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <tbody>
                    {sortedEntries.map(([name, meta]) => (
                        <tr key={name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'all 0.2s' }} className="anchor-row">
                            <td style={{ padding: '0.75rem 1.5rem', width: '45%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>
                                        {meta.type === 'tree' ? '📁' : '📄'}
                                    </span>
                                    {meta.type === 'blob' ? (
                                        <Link href={`/repo/${repoName}/file/${snapshotId}/${encodeURIComponent(name)}`} legacyBehavior>
                                            <a style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} className="file-link">{name}</a>
                                        </Link>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontWeight: 500, cursor: 'default' }}>{name}</span>
                                    )}
                                </div>
                            </td>
                            <td style={{ padding: '0.75rem 1.5rem', color: '#64748b', width: '35%' }}>
                                <span style={{ fontSize: '0.8rem' }}>Initial commit</span>
                            </td>
                            <td style={{ padding: '0.75rem 1.5rem', color: '#475569', textAlign: 'right', width: '20%', fontSize: '0.75rem', fontWeight: 600 }}>
                                2 DAYS AGO
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <style jsx>{`
                .anchor-row:hover {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                .anchor-row:hover .file-link {
                    color: #38bdf8;
                }
                .anchor-row:last-child {
                    border-bottom: none;
                }
            `}</style>
        </div>
    );
};

export default FileTable;
