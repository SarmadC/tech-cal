/**
 * Admin Ingestion Dashboard
 * 
 * Landing page for ingestion management with links to:
 * - Enrichment
 * - Moderation
 * - Update Queue (new)
 * - Field Protection Settings (new)
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminUser } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function IngestionDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Event Ingestion Management</h1>
                <p className="text-gray-600">
                    Manage event ingestion, enrichment, and update workflows
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Enrichment Section */}
                <Link
                    href="/admin/ingestion/enrichment"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <svg
                                className="w-6 h-6 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold">Event Enrichment</h2>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Manually enrich events with agenda items, speakers, and detailed information
                    </p>
                    <div className="text-sm text-blue-600 font-medium">
                        Manage events →
                    </div>
                </Link>

                {/* Update Queue Section */}
                <Link
                    href="/admin/ingestion/update-queue"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                            <svg
                                className="w-6 h-6 text-yellow-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold">Update Queue</h2>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Review and approve pending event updates from re-ingestion
                    </p>
                    <div className="text-sm text-yellow-600 font-medium">
                        Review updates →
                    </div>
                </Link>

                {/* Field Protection Section */}
                <Link
                    href="/admin/ingestion/field-protection"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <svg
                                className="w-6 h-6 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold">Field Protection</h2>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Configure which fields auto-update, require review, or are protected
                    </p>
                    <div className="text-sm text-green-600 font-medium">
                        Configure →
                    </div>
                </Link>

                {/* Moderation Section */}
                <Link
                    href="/admin/ingestion/moderation"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <svg
                                className="w-6 h-6 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold">Moderation</h2>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Review and moderate events based on quality scores
                    </p>
                    <div className="text-sm text-purple-600 font-medium">
                        Review events →
                    </div>
                </Link>
            </div>

            {/* Quick Stats Section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Updates</h3>
                    <p className="text-3xl font-bold text-yellow-600">-</p>
                    <p className="text-sm text-gray-500 mt-1">Awaiting review</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Events Needing Enrichment</h3>
                    <p className="text-3xl font-bold text-blue-600">-</p>
                    <p className="text-sm text-gray-500 mt-1">Require manual input</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Auto-Applied Updates</h3>
                    <p className="text-3xl font-bold text-green-600">-</p>
                    <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
                </div>
            </div>
        </div>
    );
}

