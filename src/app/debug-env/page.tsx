// Debug page to check environment variables in production
// Remove this file after debugging
'use client';

import { useState } from 'react';
import { oauthSignInAction } from '@/app/auth/actions';

export default function DebugEnvPage() {
    const [debugLog, setDebugLog] = useState<string[]>([]);
    
    const addLog = (message: string) => {
        console.log(message);
        setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const envVars = {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
    };

    const constructedRedirectUrl = (() => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/auth/callback`;
        }
        
        if (process.env.NEXT_PUBLIC_SITE_URL) {
            return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
        }
        
        if (process.env.NEXT_PUBLIC_VERCEL_URL) {
            const url = process.env.NEXT_PUBLIC_VERCEL_URL.startsWith('http') 
                ? process.env.NEXT_PUBLIC_VERCEL_URL 
                : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
            return `${url}/auth/callback`;
        }
        
        return 'http://localhost:3000/auth/callback';
    })();

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Environment Debug</h1>
                
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                        {JSON.stringify(envVars, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-lg font-semibold mb-4">OAuth Redirect URL</h2>
                    <p className="font-mono bg-gray-100 p-2 rounded">
                        {constructedRedirectUrl}
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
                    <h3 className="font-semibold text-blue-800 mb-4">Test OAuth Flow</h3>
                    <button 
                        onClick={async () => {
                            addLog('Testing OAuth with Google...');
                            try {
                                await oauthSignInAction('google');
                                addLog('OAuth action completed successfully');
                            } catch (error) {
                                addLog(`OAuth error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Test Google OAuth
                    </button>
                </div>

                {debugLog.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <h2 className="text-lg font-semibold mb-4">Debug Log</h2>
                        <div className="bg-gray-100 p-4 rounded text-sm max-h-60 overflow-auto">
                            {debugLog.map((log, i) => (
                                <div key={i} className="font-mono">{log}</div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <h3 className="font-semibold text-yellow-800">Expected in Production:</h3>
                    <ul className="mt-2 text-yellow-700">
                        <li>• NEXT_PUBLIC_SITE_URL should be your production domain</li>
                        <li>• OAuth redirect should match your Google OAuth settings</li>
                        <li>• windowOrigin should match your production URL</li>
                        <li>• Test button should trigger OAuth flow</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}