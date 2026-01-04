import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../config';

interface DiffProps {
    repo: string
    from: string
    to: string
}

export default function DiffViewer({ repo, from, to }: DiffProps) {
    const [diff, setDiff] = useState<string>('Loading diff...')

    useEffect(() => {
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc2NjcyODE3OX0.u2MsyMNN4A4X2e3-RwO0ga61VBjRT_ayvCgCMSln7tg";
        fetch(`${API_BASE_URL}/repos/${repo}/diff?from=${from}&to=${to}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then((r) => r.json())
            .then((data) => {
                setDiff(JSON.stringify(data, null, 2))
            })
            .catch(() => setDiff('Failed to load diff'))
    }, [repo, from, to])

    return (
        <pre
            style={{
                background: '#1e1e2e',
                color: '#fff',
                padding: '1rem',
                overflowX: 'auto',
                borderRadius: '8px',
            }}
        >
            {diff}
        </pre>
    )
}
