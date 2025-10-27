import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'Calendar API routes are working',
        timestamp: new Date().toISOString(),
        url: request.url
    });
}
