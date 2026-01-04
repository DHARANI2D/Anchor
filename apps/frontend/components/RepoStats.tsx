import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

interface Stats {
    snapshot_count: number;
    file_count: number;
}

interface RepoStatsProps {
    repoName: string;
}

const RepoStats: React.FC<RepoStatsProps> = ({ repoName }) => {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        if (!repoName) return;
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc2NjcyODE3OX0.u2MsyMNN4A4X2e3-RwO0ga61VBmRT_ayvCgCMSln7tg";
        fetch(`${API_BASE_URL}/repo/${repoName}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(err => console.error("Failed to fetch stats", err));
    }, [repoName]);

    if (!stats) return null;

    return (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>Repository Stats</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Snapshots:</span>
                <strong style={{ color: '#0ea5e9' }}>{stats.snapshot_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                <span>Files:</span>
                <strong style={{ color: '#0ea5e9' }}>{stats.file_count}</strong>
            </div>
        </div>
    );
};

export default RepoStats;
