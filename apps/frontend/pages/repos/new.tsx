import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { authFetch } from '../../utils/api';
import Link from 'next/link';
import StepUpModal from '../../components/StepUpModal';

const NewRepoPage: NextPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [stepUpOpen, setStepUpOpen] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name) return;
        setCreating(true);
        setError('');

        try {
            const res = await authFetch('/repos', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            if (res.ok) {
                router.push(`/repo/${name}`);
            } else if (res.status === 403) {
                setStepUpOpen(true);
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to create repository');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', paddingBottom: '4rem', color: '#f8fafc' }}>
            <div style={{ background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0) 100%)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '4rem 2rem', marginBottom: '3rem' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Create New Repository</h1>
                    <p style={{ fontSize: '1.1rem', color: '#94a3b8', margin: 0 }}>Start a new project with Anchor's version control.</p>
                </div>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 2rem' }}>
                <form onSubmit={handleSubmit} className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(12px)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository Name</label>
                        <input
                            type="text"
                            placeholder="e.g. my-awesome-project"
                            value={name}
                            onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.5)', color: '#f8fafc', fontSize: '1rem', outline: 'none' }}
                            required
                        />
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                            Great repository names are short and memorable.
                        </p>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                        <button
                            type="submit"
                            disabled={creating || !name}
                            style={{
                                backgroundColor: '#38bdf8',
                                color: '#0f172a',
                                border: 'none',
                                padding: '0.8rem 2rem',
                                borderRadius: '0.5rem',
                                fontWeight: 700,
                                cursor: creating ? 'not-allowed' : 'pointer',
                                opacity: creating ? 0.7 : 1,
                                flex: 1,
                                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {creating ? 'Creating...' : 'Create Repository'}
                        </button>
                        <Link href="/repos" legacyBehavior>
                            <a style={{
                                padding: '0.8rem 2rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: 600,
                                textAlign: 'center',
                                transition: 'all 0.2s'
                            }}>
                                Cancel
                            </a>
                        </Link>
                    </div>
                </form>
            </div>
            <StepUpModal
                isOpen={stepUpOpen}
                onSuccess={() => {
                    setStepUpOpen(false);
                    handleSubmit();
                }}
                onCancel={() => setStepUpOpen(false)}
            />
        </div>
    );
};

export default NewRepoPage;
