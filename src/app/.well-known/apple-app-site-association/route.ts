import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json(
      { error: 'Universal Links are not configured.' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${teamId}.com.kurecal.mobile`],
          components: [
            { '/': '/events/*' },
            { '/': '/u/*' },
            { '/': '/circle/*' },
          ],
        },
      ],
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
