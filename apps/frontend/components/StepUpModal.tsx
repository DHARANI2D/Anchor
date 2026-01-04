import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

interface StepUpModalProps {
    isOpen: boolean;
    onSuccess: (token: string) => void;
    onCancel: () => void;
}

const StepUpModal: React.FC<StepUpModalProps> = ({ isOpen, onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [isMFAEnabled, setIsMFAEnabled] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setPassword('');
            setCode('');
            setError('');
            // Check if user has MFA enabled
            const token = localStorage.getItem('anchor_token');
            fetch(`${API_BASE_URL}/user/2fa/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(r => r.json())
                .then(data => setIsMFAEnabled(data.enabled))
                .catch(err => console.error("Failed to check MFA status", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('anchor_token');
            const res = await fetch(`${API_BASE_URL}/auth/step-up`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    password,
                    ...(isMFAEnabled ? { code } : {})
                })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('anchor_token', data.access_token);
                onSuccess(data.access_token);
            } else {
                const errData = await res.json();
                setError(errData.detail || 'Verification failed');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass" style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#1e293b',
                padding: '2.5rem',
                borderRadius: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Security Verification</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        {isMFAEnabled ? 'Multifactor authentication is required for this action.' : 'Please re-enter your password to perform this sensitive action.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                color: '#f8fafc',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {isMFAEnabled && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>2FA CODE</label>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                    color: '#f8fafc',
                                    fontSize: '1.2rem',
                                    letterSpacing: '0.5rem',
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                backgroundColor: 'transparent',
                                color: '#94a3b8',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2,
                                padding: '0.8rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                backgroundColor: '#38bdf8',
                                color: '#0f172a',
                                fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'VERIFYING...' : 'CONFIRM'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StepUpModal;
