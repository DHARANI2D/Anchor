import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ShareLinkPage() {
    const router = useRouter();
    const { token } = router.query;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            verifyShareLink();
        }
    }, [token]);

    const verifyShareLink = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
            const response = await fetch(`${apiUrl}/share/${token}`);

            if (response.ok) {
                const data = await response.json();
                // Redirect to the public repository view
                router.push(`/public/${data.repository}`);
            } else {
                setError('Share link not found or expired');
                setLoading(false);
            }
        } catch (err) {
            setError('Failed to verify share link');
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Shared Repository | Anchor</title>
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                {loading ? (
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                        <p className="mt-4 text-white/60">Verifying share link...</p>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="text-6xl mb-4">🔗</div>
                        <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
                        <p className="text-white/60 mb-6">
                            This share link may have been revoked or expired.
                        </p>
                        <button
                            onClick={() => router.push('/public')}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                        >
                            Browse Public Repositories
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
