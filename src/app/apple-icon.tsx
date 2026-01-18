import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                }}
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 120 120"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Background */}
                    <rect width="120" height="120" fill="white" />

                    {/* Back-left arm (going back-left into the scene) */}
                    <polygon points="60,60 52,56 28,68 36,72" fill="#000" fillOpacity="0.3" />
                    <polygon points="36,72 28,68 28,76 36,80" fill="#000" fillOpacity="0.3" />
                    <polygon points="60,60 36,72 36,80 60,68" fill="#000" fillOpacity="0.5" />

                    {/* Back-right arm (going back-right into the scene) */}
                    <polygon points="60,60 68,56 92,68 84,72" fill="#000" fillOpacity="0.7" />
                    <polygon points="84,72 92,68 92,76 84,80" fill="#000" fillOpacity="0.5" />
                    <polygon points="60,60 84,72 84,80 60,68" fill="#000" fillOpacity="0.7" />

                    {/* Bottom arm (going down) */}
                    <polygon points="52,64 60,68 60,100 52,96" fill="#000" fillOpacity="0.5" />
                    <polygon points="68,64 60,68 60,100 68,96" fill="#000" fillOpacity="0.3" />
                    <polygon points="52,96 60,100 68,96 60,92" fill="#000" fillOpacity="0.3" />

                    {/* Front-left arm (coming forward-left) */}
                    <polygon points="60,60 52,64 28,52 36,48" fill="#000" fillOpacity="0.85" />
                    <polygon points="36,48 28,52 28,44 36,40" fill="#000" fillOpacity="0.7" />
                    <polygon points="60,60 36,48 36,40 60,52" fill="#000" fillOpacity="0.85" />

                    {/* Front-right arm (coming forward-right) */}
                    <polygon points="60,60 68,64 92,52 84,48" fill="#000" />
                    <polygon points="84,48 92,52 92,44 84,40" fill="#000" fillOpacity="0.85" />
                    <polygon points="60,60 84,48 84,40 60,52" fill="#000" />

                    {/* Top arm (going up) */}
                    <polygon points="52,56 60,52 60,20 52,24" fill="#000" />
                    <polygon points="68,56 60,52 60,20 68,24" fill="#000" />
                    <polygon points="52,24 60,20 68,24 60,28" fill="#000" />

                    {/* Center top face (brightest) */}
                    <polygon points="52,56 60,52 68,56 60,60" fill="#000" />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    );
}
