import { describe, expect, it } from 'vitest';
import { SITE_URL } from '@/config/site';
import { buildEmbedIframeCode } from '../EmbedButton';

describe('buildEmbedIframeCode', () => {
  it('escapes title attributes and encodes slug path segment', () => {
    const code = buildEmbedIframeCode(
      'hello world/2026',
      'Dev "Best" <Event> & Meetup'
    );

    expect(code).toContain(`${SITE_URL}/embed/hello%20world%2F2026`);
    expect(code).toContain(
      'title="Dev &quot;Best&quot; &lt;Event&gt; &amp; Meetup"'
    );
  });
});
