import { NextResponse } from 'next/server';

export function isAllowedSupabaseOAuthUrl(
  targetUrl: string,
  supabaseUrl: string
): boolean {
  try {
    const target = new URL(targetUrl);
    const supabase = new URL(supabaseUrl);
    return (
      !target.username &&
      !target.password &&
      target.origin === supabase.origin &&
      target.pathname === '/auth/v1/authorize'
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !targetUrl ||
    !supabaseUrl ||
    !isAllowedSupabaseOAuthUrl(targetUrl, supabaseUrl)
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  return NextResponse.redirect(targetUrl);
}
