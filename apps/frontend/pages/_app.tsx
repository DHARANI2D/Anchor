import '../styles/glass.css'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Navbar from '../components/Navbar'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import { initTokenRefresh, clearTokenRefresh } from '../utils/api'

function MyApp({ Component, pageProps }: AppProps) {
    const router = useRouter()
    const isLoginPage = router.pathname === '/login'
    const isPublicPage = router.pathname === '/docs'

    useEffect(() => {
        // Implement Trusted Types policy
        if (typeof window !== 'undefined' && (window as any).trustedTypes && (window as any).trustedTypes.createPolicy) {
            try {
                if (!(window as any).trustedTypes.defaultPolicy) {
                    (window as any).trustedTypes.createPolicy('default', {
                        createHTML: (string: string) => {
                            // In development, allow Next.js dev server to function
                            if (process.env.NODE_ENV === 'development') {
                                return string;
                            }
                            // In production, you should use a sanitizer here
                            return string;
                        },
                        createScript: (string: string) => string,
                        createScriptURL: (string: string) => string,
                    });
                }
            } catch (e) {
                console.warn('Trusted Types policy creation failed or already exists');
            }
        }

        const token = localStorage.getItem('anchor_token')
        if (!token && !isLoginPage && !isPublicPage) {
            router.push('/login')
        } else if (token && isLoginPage) {
            router.push('/')
        }

        // Initialize proactive token refresh
        if (token && !isLoginPage) {
            initTokenRefresh();
        }

        // Cleanup on unmount
        return () => {
            clearTokenRefresh();
        };
    }, [isLoginPage])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--surface)' }}>
            {!isLoginPage && !isPublicPage && <Navbar />}
            <DarkModeToggle />
            <main style={{ flex: 1 }}>
                <Component {...pageProps} />
            </main>
            {!isLoginPage && !isPublicPage && <Footer />}
        </div>
    )
}

export default MyApp
