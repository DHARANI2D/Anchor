import React from 'react';
import { NextPage } from 'next';

interface ErrorProps {
    statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#050b14',
            color: '#f8fafc',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '4rem', margin: 0 }}>{statusCode || 'Error'}</h1>
            <p style={{ color: '#94a3b8' }}>
                {statusCode
                    ? `An error ${statusCode} occurred on server`
                    : 'An error occurred on client'}
            </p>
            <button
                onClick={() => window.location.href = '/'}
                style={{
                    marginTop: '2rem',
                    padding: '0.8rem 2rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: '#38bdf8',
                    color: '#0f172a',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Go Home
            </button>
        </div>
    );
};

Error.getInitialProps = ({ res, err }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default Error;
