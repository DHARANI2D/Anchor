import React from 'react'

interface PortfolioCardProps {
    title: string
    summary: string
    tech: string[]
    demo?: string
}

export default function PortfolioCard({ title, summary, tech, demo }: PortfolioCardProps) {
    return (
        <div className="glass" style={{ padding: '1rem', margin: '0.5rem' }}>
            <h3>{title}</h3>
            <p>{summary}</p>
            <p><strong>Tech:</strong> {tech.join(', ')}</p>
            {demo && (
                <a href={demo} target="_blank" rel="noopener" style={{ color: '#0ea5e9' }}>
                    Demo ↗
                </a>
            )}
        </div>
    )
}
