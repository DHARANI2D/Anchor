import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { authFetch } from '../utils/api';

interface SecurityFeature {
    enabled: boolean;
    status: string;
    description: string;
    details: string;
}

interface StatusData {
    status: string;
    uptime: string;
    version: string;
    storage: {
        root: string;
        repositories: number;
    };
    security: {
        [key: string]: SecurityFeature;
    };
    timestamp: string;
}

const StatusPage = () => {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(10); // seconds
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await authFetch('/status');
            if (!res.ok) throw new Error('Failed to fetch status');
            const data = await res.json();
            setStatus(data);
            setError(null);
            setLastCheck(new Date());
        } catch (err) {
            setError('Backend unreachable');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        if (autoRefresh) {
            const interval = setInterval(fetchStatus, refreshInterval * 1000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'operational': return 'var(--secondary)';
            case 'degraded': return '#fbbf24';
            case 'outage': return '#f87171';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'operational': return '✓';
            case 'degraded': return '⚠';
            case 'outage': return '✗';
            default: return '?';
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', padding: '5rem 2rem', fontFamily: '"Outfit", -apple-system, sans-serif' }}>
            <Head>
                <title>Anchor | System Status</title>
            </Head>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--primary)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)', color: 'white' }}>📊</div>
                        <div>
                            <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.04em' }}>System Status</h1>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '1.1rem', fontWeight: 500 }}>Real-time monitoring of Anchor Core services & security features.</p>
                        </div>
                    </div>

                    {/* Auto-refresh controls */}
                    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 2rem', border: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Auto-refresh</span>
                        </label>
                        <select
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            disabled={!autoRefresh}
                            style={{
                                padding: '0.6rem 1rem',
                                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                                color: 'var(--text-primary)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.75rem',
                                cursor: autoRefresh ? 'pointer' : 'not-allowed',
                                opacity: autoRefresh ? 1 : 0.5,
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        >
                            <option value={5}>5s</option>
                            <option value={10}>10s</option>
                            <option value={30}>30s</option>
                            <option value={60}>60s</option>
                        </select>
                        <button
                            onClick={fetchStatus}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '3rem' }}>
                    {/* Overall Health */}
                    <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Service Network Health</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: error ? '#f87171' : 'var(--secondary)',
                                    boxShadow: error ? '0 0 20px #f87171' : '0 0 20px var(--secondary)',
                                    animation: 'pulse 2s infinite'
                                }}></div>
                                <span style={{ fontWeight: 800, color: error ? '#f87171' : 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.2rem' }}>
                                    {error ? 'System Outage' : 'All Systems Operational'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* System Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem' }}>
                        <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2rem 0', fontWeight: 800 }}>Core Engine</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>System Uptime</span>
                                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{status?.uptime || '--'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Anchor Version</span>
                                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{status?.version || '--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2rem 0', fontWeight: 800 }}>Secure Storage</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Repositories</span>
                                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{status?.storage.repositories ?? '--'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Root Directive</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-light)', fontFamily: 'monospace' }}>{status?.storage.root || '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Features */}
                    <div className="glass-card" style={{ padding: '3rem', borderRadius: '2rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', letterSpacing: '-0.02em' }}>
                            <span style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.4))' }}>🛡️</span> Advanced Security Matrix
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 1rem', borderRadius: '2rem' }}>
                                {Object.values(status?.security || {}).filter(f => f.enabled).length} Protocols Active
                            </span>
                        </h2>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {status?.security && Object.entries(status.security).map(([key, feature]) => (
                                <div
                                    key={key}
                                    className="glass"
                                    style={{
                                        padding: '2rem',
                                        borderRadius: '1.5rem',
                                        border: `1px solid ${getStatusColor(feature.status)}33`,
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                                        e.currentTarget.style.transform = 'translateX(8px)';
                                        e.currentTarget.style.borderColor = `${getStatusColor(feature.status)}88`;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--glass-bg)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.borderColor = `${getStatusColor(feature.status)}33`;
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{
                                                fontSize: '1.4rem',
                                                fontWeight: 800,
                                                margin: '0 0 0.5rem 0',
                                                textTransform: 'capitalize',
                                                letterSpacing: '-0.01em'
                                            }}>
                                                {key.replace(/_/g, ' ')}
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>
                                                {feature.description}
                                            </p>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: `${getStatusColor(feature.status)}11`,
                                            borderRadius: '1rem',
                                            border: `1px solid ${getStatusColor(feature.status)}44`,
                                            boxShadow: `0 0 20px ${getStatusColor(feature.status)}11`
                                        }}>
                                            <span style={{
                                                fontSize: '1.25rem',
                                                color: getStatusColor(feature.status)
                                            }}>
                                                {getStatusIcon(feature.status)}
                                            </span>
                                            <span style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 800,
                                                color: getStatusColor(feature.status),
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em'
                                            }}>
                                                {feature.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.95rem',
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'monospace',
                                        padding: '1.25rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: '1rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        fontWeight: 500
                                    }}>
                                        {feature.details}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Last Updated */}
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '2rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></span>
                            Last Integrity Check: {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}
                        </div>
                        {autoRefresh && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                                Neural link active • Auto-synchronizing every {refreshInterval} seconds
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
};

export default StatusPage;
