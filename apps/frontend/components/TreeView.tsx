import React, { FC, useState } from 'react';
import Link from 'next/link';

interface TreeEntry {
    type: string;
    id: string;
}

interface TreeNode {
    entries: Record<string, TreeEntry>;
}

interface TreeViewProps {
    repoName: string;
    snapshotId: string;
    tree: TreeNode | null;
}

interface NestedNode {
    type: 'blob' | 'tree';
    id?: string;
    children?: Record<string, NestedNode>;
    fullPath: string;
}

const TreeItem: FC<{ name: string; node: NestedNode; repoName: string; snapshotId: string }> = ({ name, node, repoName, snapshotId }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (node.type === 'blob') {
        return (
            <li style={{ marginBottom: '0.4rem' }}>
                <Link href={`/repo/${repoName}/file/${snapshotId}/${encodeURIComponent(node.fullPath)}`} legacyBehavior>
                    <a style={{
                        color: '#94a3b8',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.5rem',
                        transition: 'all 0.2s'
                    }} className="tree-link">
                        <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>📄</span>
                        {name}
                    </a>
                </Link>
            </li>
        );
    }

    const childrenEntries: [string, NestedNode][] = node.children ? Object.entries(node.children) : [];

    return (
        <li style={{ marginBottom: '0.4rem' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontWeight: 600,
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'all 0.2s'
                }}
                className="tree-link"
            >
                <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>{isOpen ? '📂' : '📁'}</span>
                {name}
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5 }}>{isOpen ? '▼' : '▶'}</span>
            </div>
            {isOpen && node.children && (
                <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', marginTop: '0.4rem', borderLeft: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    {childrenEntries
                        .sort(([aName, aNode], [bName, bNode]) => {
                            if (aNode.type !== bNode.type) return aNode.type === 'tree' ? -1 : 1;
                            return aName.localeCompare(bName);
                        })
                        .map(([childName, childNode]) => (
                            <TreeItem
                                key={childName}
                                name={childName}
                                node={childNode}
                                repoName={repoName}
                                snapshotId={snapshotId}
                            />
                        ))}
                </ul>
            )}
            <style jsx>{`
                .tree-link:hover {
                    background-color: rgba(255, 255, 255, 0.03);
                    color: #38bdf8 !important;
                }
            `}</style>
        </li>
    );
};

const TreeView: FC<TreeViewProps> = ({ repoName, snapshotId, tree }) => {
    if (!tree) return <p style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem' }}>No tree data available.</p>;

    // Transform flat tree to nested structure
    const root: Record<string, NestedNode> = {};
    Object.entries(tree.entries).forEach(([path, meta]) => {
        const parts = path.split('/');
        let current = root;
        parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;
            if (!current[part]) {
                current[part] = {
                    type: isLast ? (meta.type as 'blob' | 'tree') : 'tree',
                    fullPath: parts.slice(0, index + 1).join('/'),
                    ...(isLast ? { id: meta.id } : { children: {} }),
                };
            }
            if (!isLast) {
                if (!current[part].children) current[part].children = {};
                current = current[part].children!;
            }
        });
    });

    const rootEntries: [string, NestedNode][] = Object.entries(root);

    return (
        <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.9rem', margin: 0 }}>
            {rootEntries
                .sort(([aName, aNode], [bName, bNode]) => {
                    if (aNode.type !== bNode.type) return aNode.type === 'tree' ? -1 : 1;
                    return aName.localeCompare(bName);
                })
                .map(([name, node]) => (
                    <TreeItem
                        key={name}
                        name={name}
                        node={node}
                        repoName={repoName}
                        snapshotId={snapshotId}
                    />
                ))}
        </ul>
    );
};

export default TreeView;
