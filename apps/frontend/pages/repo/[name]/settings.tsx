import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

interface ShareLink {
    share_token: string;
    share_url: string;
    created_at: string;
}

export default function RepositorySettings() {
    const router = useRouter();
    const { name } = router.query;

    const [isPublic, setIsPublic] = useState(false);
    const [shareLink, setShareLink] = useState<ShareLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (name) {
            fetchRepositorySettings();
        }
    }, [name]);

    const fetchRepositorySettings = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
            const response = await fetch(`${apiUrl}/repos/${name}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setIsPublic(data.is_public || false);
                if (data.share_token) {
                    setShareLink({
                        share_token: data.share_token,
                        share_url: `${window.location.origin}/share/${data.share_token}`,
                        created_at: data.share_token_created_at
                    });
                }
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    const toggleVisibility = async () => {
        setSaving(true);
        setMessage('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
            const response = await fetch(`${apiUrl}/repos/${name}/visibility?is_public=${!isPublic}`, {
                method: 'PATCH',
                credentials: 'include',
            });

            if (response.ok) {
                setIsPublic(!isPublic);
                setMessage(`Repository is now ${!isPublic ? 'public' : 'private'}`);
            } else {
                setMessage('Failed to update visibility');
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setSaving(false);
        }
    };

    const generateShareLink = async () => {
        setSaving(true);
        setMessage('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
            const response = await fetch(`${apiUrl}/repos/${name}/share`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setShareLink({
                    share_token: data.share_token,
                    share_url: data.share_url,
                    created_at: data.created_at
                });
                setMessage('Share link generated successfully');
            } else {
                setMessage('Failed to generate share link');
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setSaving(false);
        }
    };

    const revokeShareLink = async () => {
        if (!confirm('Are you sure you want to revoke this share link? It will no longer work.')) {
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
            const response = await fetch(`${apiUrl}/repos/${name}/share`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setShareLink(null);
                setMessage('Share link revoked successfully');
            } else {
                setMessage('Failed to revoke share link');
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setSaving(false);
        }
    };

    const copyShareLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink.share_url);
            setMessage('Share link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{name} - Settings | Anchor</title>
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Header */}
                <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center space-x-4">
                            <Link href="/">
                                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent cursor-pointer">
                                    Anchor
                                </span>
                            </Link>
                            <span className="text-white/40">/</span>
                            <Link href={`/repo/${name}`}>
                                <span className="text-white hover:text-purple-400 cursor-pointer">{name}</span>
                            </Link>
                            <span className="text-white/40">/</span>
                            <span className="text-white font-semibold">Settings</span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-3xl font-bold text-white mb-8">Repository Settings</h1>

                    {/* Message */}
                    {message && (
                        <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-200">
                            {message}
                        </div>
                    )}

                    {/* Visibility Section */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">🔓 Repository Visibility</h2>
                        <p className="text-white/70 mb-6">
                            Control who can access this repository. Public repositories can be viewed by anyone without authentication.
                        </p>

                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <span className="text-white font-medium">Public Access</span>
                                    <span className={`px-3 py-1 text-xs rounded-full ${isPublic
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                        }`}>
                                        {isPublic ? 'Public' : 'Private'}
                                    </span>
                                </div>
                                <p className="text-white/60 text-sm">
                                    {isPublic
                                        ? 'Anyone can view this repository without signing in'
                                        : 'Only authenticated users can access this repository'}
                                </p>
                            </div>

                            <button
                                onClick={toggleVisibility}
                                disabled={saving}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${isPublic
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {saving ? 'Saving...' : (isPublic ? 'Make Private' : 'Make Public')}
                            </button>
                        </div>

                        {isPublic && (
                            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-blue-300 text-sm">
                                    ⚠️ This repository is publicly accessible at: <br />
                                    <Link href={`/public/${name}`}>
                                        <span className="text-blue-400 hover:underline cursor-pointer">
                                            {window.location.origin}/public/{name}
                                        </span>
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Share Link Section */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">🔗 Share Link</h2>
                        <p className="text-white/70 mb-6">
                            Generate a unique share link that allows read-only access to this repository without authentication.
                        </p>

                        {!shareLink ? (
                            <button
                                onClick={generateShareLink}
                                disabled={saving}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Generating...' : 'Generate Share Link'}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-black/20 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/60 text-sm">Share URL</span>
                                        <button
                                            onClick={copyShareLink}
                                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-all"
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                    <code className="block p-3 bg-black/30 text-purple-300 rounded text-sm break-all">
                                        {shareLink.share_url}
                                    </code>
                                    <p className="text-white/40 text-xs mt-2">
                                        Created: {new Date(shareLink.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <button
                                    onClick={revokeShareLink}
                                    disabled={saving}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Revoking...' : 'Revoke Share Link'}
                                </button>
                            </div>
                        )}

                        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-300 text-sm">
                                ℹ️ Share links provide read-only access and can be revoked at any time. All access via share links is logged for security.
                            </p>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-2">🔒 Security & Privacy</h3>
                        <ul className="text-white/70 text-sm space-y-2">
                            <li>• All public repository access is logged with IP addresses and timestamps</li>
                            <li>• Share links can be revoked instantly if compromised</li>
                            <li>• Public repositories are read-only for unauthenticated users</li>
                            <li>• Access logs are monitored for suspicious activity</li>
                        </ul>
                    </div>
                </main>
            </div>
        </>
    );
}
