'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugOAuthPage() {
    const searchParams = useSearchParams();
    const [logs, setLogs] = useState<string[]>([]);
    const [authState, setAuthState] = useState<any>(null);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `${timestamp}: ${message}`;
        console.log(logEntry);
        setLogs(prev => [...prev, logEntry]);
    };

    useEffect(() => {
        const checkAuthState = async () => {
            try {
                addLog('Checking current auth state...');
                const supabase = createClient();
                
                const { data: { session }, error } = await supabase.auth.getSession();
                addLog(`Session check: ${error ? `Error: ${error.message}` : session ? 'Session exists' : 'No session'}`);
                
                if (session) {
                    addLog(`User ID: ${session.user?.id}`);
                    addLog(`User email: ${session.user?.email}`);
                    addLog(`Provider: ${session.user?.app_metadata?.provider}`);
                }

                setAuthState({
                    session: session ? 'exists' : 'none',
                    user: session?.user ? {
                        id: session.user.id,
                        email: session.user.email,
                        provider: session.user.app_metadata?.provider
                    } : null,
                    error: error?.message
                });

            } catch (err) {
                addLog(`Auth check exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        };

        // Check URL parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (code) {
            addLog(`OAuth callback received with code: ${code.substring(0, 20)}...`);
        }

        if (error) {
            addLog(`OAuth error received: ${error}`);
            if (errorDescription) {
                addLog(`Error description: ${errorDescription}`);
            }
        }

        if (!code && !error) {
            addLog('Direct page access (no OAuth callback parameters)');
        }

        addLog(`Current URL: ${window.location.href}`);
        addLog(`Origin: ${window.location.origin}`);
        addLog(`Environment: ${process.env.NODE_ENV}`);
        addLog(`Site URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'not set'}`);

        checkAuthState();
    }, [searchParams]);

    const testSupabaseConnection = async () => {
        try {
            addLog('Testing Supabase connection...');
            const supabase = createClient();
            
            // Test basic connection
            const { error } = await supabase.from('profiles').select('id').limit(1);
            
            if (error) {
                addLog(`Supabase connection error: ${error.message}`);
            } else {
                addLog('Supabase connection successful');
            }
        } catch (err) {
            addLog(`Supabase test exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const startOAuthFlow = async () => {
        try {
            addLog('Starting OAuth flow...');
            const supabase = createClient();
            
            const redirectTo = `${window.location.origin}/debug-oauth`;
            addLog(`Redirect URL will be: ${redirectTo}`);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) {
                addLog(`OAuth initiation error: ${error.message}`);
            } else if (data.url) {
                addLog(`OAuth URL generated: ${data.url}`);
                addLog('Redirecting to Google...');
                window.location.href = data.url;
            } else {
                addLog('No OAuth URL received from Supabase');
            }
        } catch (err) {
            addLog(`OAuth start exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">OAuth Debug Page</h1>
                
                <div className="grid gap-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Actions</h2>
                        <div className="space-x-4">
                            <button 
                                onClick={startOAuthFlow}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Start OAuth Flow
                            </button>
                            <button 
                                onClick={testSupabaseConnection}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Test Supabase
                            </button>
                        </div>
                    </div>

                    {authState && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4">Current Auth State</h2>
                            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                                {JSON.stringify(authState, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Debug Log</h2>
                        <div className="bg-gray-100 p-4 rounded text-sm max-h-96 overflow-auto">
                            {logs.length === 0 ? (
                                <div className="text-gray-500">No logs yet...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="font-mono mb-1">{log}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}