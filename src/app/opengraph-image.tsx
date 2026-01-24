
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Kure-Cal tech events calendar'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    // Font loading logic can be added here if needed, keeping it simple for now with system fonts

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #000000, #111111)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '80px',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
                    {/* Inline Logo SVG for reliability in Edge Runtime */}
                    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                        {/* 3D Asterisk - 6 arms extending from center */}

                        {/* Back-left arm */}
                        <path d="M60 60 L52 56 L28 68 L36 72 Z" fill="#FFFFFF" opacity="0.3" />
                        <path d="M36 72 L28 68 L28 76 L36 80 Z" fill="#FFFFFF" opacity="0.3" />
                        <path d="M60 60 L36 72 L36 80 L60 68 Z" fill="#FFFFFF" opacity="0.5" />

                        {/* Back-right arm */}
                        <path d="M60 60 L68 56 L92 68 L84 72 Z" fill="#FFFFFF" opacity="0.7" />
                        <path d="M84 72 L92 68 L92 76 L84 80 Z" fill="#FFFFFF" opacity="0.5" />
                        <path d="M60 60 L84 72 L84 80 L60 68 Z" fill="#FFFFFF" opacity="0.7" />

                        {/* Bottom arm */}
                        <path d="M52 64 L60 68 L60 100 L52 96 Z" fill="#FFFFFF" opacity="0.5" />
                        <path d="M68 64 L60 68 L60 100 L68 96 Z" fill="#FFFFFF" opacity="0.3" />
                        <path d="M52 96 L60 100 L68 96 L60 92 Z" fill="#FFFFFF" opacity="0.3" />

                        {/* Front-left arm */}
                        <path d="M60 60 L52 64 L28 52 L36 48 Z" fill="#FFFFFF" opacity="0.85" />
                        <path d="M36 48 L28 52 L28 44 L36 40 Z" fill="#FFFFFF" opacity="0.7" />
                        <path d="M60 60 L36 48 L36 40 L60 52 Z" fill="#FFFFFF" opacity="0.85" />

                        {/* Front-right arm */}
                        <path d="M60 60 L68 64 L92 52 L84 48 Z" fill="#FFFFFF" opacity="1" />
                        <path d="M84 48 L92 52 L92 44 L84 40 Z" fill="#FFFFFF" opacity="0.85" />
                        <path d="M60 60 L84 48 L84 40 L60 52 Z" fill="#FFFFFF" opacity="1" />

                        {/* Top arm */}
                        <path d="M52 56 L60 52 L60 20 L52 24 Z" fill="#FFFFFF" opacity="1" />
                        <path d="M68 56 L60 52 L60 20 L68 24 Z" fill="#FFFFFF" opacity="1" />
                        <path d="M52 24 L60 20 L68 24 L60 28 Z" fill="#FFFFFF" opacity="1" />

                        {/* Center top face */}
                        <path d="M52 56 L60 52 L68 56 L60 60 Z" fill="#FFFFFF" opacity="1" />
                    </svg>
                    <div style={{ height: '4px', width: '60px', background: '#6366f1', marginLeft: '40px', marginTop: '-30px' }} />
                </div>

                <div style={{ fontSize: 32, marginBottom: '24px', opacity: 0.7 }}>Kure-Cal</div>

                <div style={{ fontSize: 96, fontWeight: 'bold', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                    Tech events, organized
                </div>

                <div style={{ fontSize: 48, opacity: 0.6, maxWidth: '900px', lineHeight: 1.4 }}>
                    Organize conferences, meetups, and CFPs in one place
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
