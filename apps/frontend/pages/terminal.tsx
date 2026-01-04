import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TerminalGuide = () => {
    const commands = [
        {
            cmd: 'login',
            args: '<username> <password>',
            desc: 'Authenticate with the Anchor platform using your credentials.',
            example: 'anchor login admin anchor2025'
        },
        {
            cmd: 'ssh-login',
            args: '<username> <key_path>',
            desc: 'Securely authenticate using your registered SSH private key.',
            example: 'anchor ssh-login admin ~/.ssh/id_rsa'
        },
        {
            cmd: 'init',
            args: '',
            desc: 'Initialize a new Anchor repository in the current directory.',
            example: 'anchor init'
        },
        {
            cmd: 'clone',
            args: '<repository>',
            desc: 'Clone a repository from Anchor. Works with public repos without authentication.',
            example: 'anchor clone my-repo'
        },
        {
            cmd: 'status',
            args: '',
            desc: 'Show the working tree status and staged changes.',
            example: 'anchor status'
        },
        {
            cmd: 'commit',
            args: '-m <message>',
            desc: 'Record changes to the repository with a descriptive message.',
            example: 'anchor commit -m "Add new feature"'
        },
        {
            cmd: 'push',
            args: '',
            desc: 'Upload local commits to the remote repository.',
            example: 'anchor push'
        },
        {
            cmd: 'pull',
            args: '',
            desc: 'Download and integrate changes from the remote repository.',
            example: 'anchor pull'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050b14', color: '#e2e8f0', fontFamily: '"Inter", sans-serif' }}>
            <Head>
                <title>Anchor | Terminal Guide</title>
            </Head>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 2rem' }}>
                <div style={{ marginBottom: '4rem' }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0 0 1rem 0', background: 'linear-gradient(to right, #38bdf8, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                        Terminal Integration
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '700px', lineHeight: 1.6 }}>
                        Master the Anchor platform from your command line. Use our dedicated CLI tool for seamless repository management and system monitoring.
                    </p>
                </div>

                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '0.875rem' }}>01</span>
                        Getting Started
                    </h2>
                    <div className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '2rem' }}>
                        <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
                            Install the Anchor CLI globally using pip:
                        </p>
                        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.75rem', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
                            <span style={{ color: '#64748b' }}>$</span> pip install anchor-cli
                        </div>
                        <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
                            Or install from source for development:
                        </p>
                        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.75rem', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
                            <span style={{ color: '#64748b' }}>$</span> git clone https://github.com/yourusername/anchor-cli.git<br />
                            <span style={{ color: '#64748b' }}>$</span> cd anchor-cli<br />
                            <span style={{ color: '#64748b' }}>$</span> pip install -e .
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                            Note: The CLI requires Python 3.8+ and will automatically install <code style={{ color: '#cbd5e1' }}>requests</code>, <code style={{ color: '#cbd5e1' }}>cryptography</code>, and <code style={{ color: '#cbd5e1' }}>pyotp</code> libraries.
                        </p>
                    </div>
                </section>

                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '0.875rem' }}>02</span>
                        Command Reference
                    </h2>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {commands.map((c) => (
                            <div key={c.cmd} className="glass" style={{ backgroundColor: 'rgba(30, 41, 59, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '1.5rem', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '0.375rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700 }}>
                                        {c.cmd}
                                    </span>
                                    <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {c.args}
                                    </span>
                                </div>
                                <p style={{ color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.5 }}>
                                    {c.desc}
                                </p>
                                <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.5rem', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <span style={{ color: 'rgba(56, 189, 248, 0.5)', marginRight: '0.5rem' }}># Example</span>
                                    <br />
                                    <span style={{ color: '#cbd5e1' }}>{c.example}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '0.875rem' }}>03</span>
                        SSH Authentication
                    </h2>
                    <div className="glass" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.3))', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '2rem' }}>
                        <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
                            For enhanced security, we recommend using SSH-key based authentication. Register your public key in the <Link href="/settings" legacyBehavior><a style={{ color: '#38bdf8', textDecoration: 'none' }}>Settings</a></Link> page to get started.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '0.75rem' }}>
                            <span style={{ color: '#38bdf8', fontSize: '1.25rem' }}>ℹ️</span>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                                The <code style={{ color: '#cbd5e1' }}>key_id</code> required for SSH login can be found next to each registered key in your account settings.
                            </p>
                        </div>
                    </div>
                </section>

                <section style={{ marginTop: '4rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: '0.875rem' }}>🌐</span>
                        Public Repository Access
                    </h2>
                    <div className="glass" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(15, 23, 42, 0.3))', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '1rem', padding: '2rem' }}>
                        <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
                            Anchor supports public repositories that can be accessed without authentication. Browse public repositories at <Link href="/public" legacyBehavior><a style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>/public</a></Link>.
                        </p>
                        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.75rem', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
                            <span style={{ color: 'rgba(34, 197, 94, 0.5)', marginRight: '0.5rem' }}># Clone a public repository</span>
                            <br />
                            <span style={{ color: '#cbd5e1' }}>anchor clone public-repo</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)', borderRadius: '0.75rem' }}>
                            <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>🔒</span>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                                All public repository access is logged with IP addresses and timestamps for security monitoring. Public repositories are read-only for unauthenticated users.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default TerminalGuide;
