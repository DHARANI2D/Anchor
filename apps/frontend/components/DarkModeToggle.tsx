import { useEffect } from 'react'

export default function DarkModeToggle() {
    const toggle = () => {
        document.documentElement.classList.toggle('dark')
    }

    useEffect(() => {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    return (
        <button
            onClick={toggle}
            style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#fff',
                cursor: 'pointer',
            }}
        >
            Toggle Dark Mode
        </button>
    )
}
