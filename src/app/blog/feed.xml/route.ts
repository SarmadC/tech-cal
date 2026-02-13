// src/app/blog/feed.xml/route.ts
import { createClient } from '@/utils/supabase/server';
import { SITE_URL } from '@/config/site';

export const revalidate = 3600; // 1 hour

export async function GET() {
    const supabase = await createClient();

    const { data: posts } = await supabase
        .from('posts')
        .select('title, slug, excerpt, published_at')
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

    const siteUrl = SITE_URL;

    const escapeXml = (str: string) =>
        str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

    const items = (posts || [])
        .map(
            (post) => `
    <item>
      <title>${escapeXml(post.title || '')}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      <pubDate>${new Date(post.published_at || '').toUTCString()}</pubDate>
    </item>`
        )
        .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kure-Cal Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Insights, tutorials, and news from the tech events world.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
