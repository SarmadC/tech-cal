import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

async function main() {
  dotenv.config({ path: '.env.local' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('hackathons')
    .select('id,title,tags,feature_version,recommendation_features')
    .order('start_date', { ascending: true })
    .limit(200);

  if (error) throw error;

  const rows = data || [];
  console.log('count', rows.length);
  const versionCounts = new Map<number, number>();
  const difficultyCounts = new Map<string, number>();
  const formatCounts = new Map<string, number>();
  const commitmentCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  let missingReq = 0;
  let missingThemes = 0;
  let avgReqLen = 0;
  let avgThemeLen = 0;

  for (const row of rows as any[]) {
    const v = row.feature_version ?? -1;
    versionCounts.set(v, (versionCounts.get(v) || 0) + 1);
    const f = row.recommendation_features || {};
    const req = Array.isArray(f.requiredTech) ? f.requiredTech : [];
    const themes = Array.isArray(f.themes) ? f.themes : [];
    if (req.length === 0) missingReq++;
    if (themes.length === 0) missingThemes++;
    avgReqLen += req.length;
    avgThemeLen += themes.length;
    difficultyCounts.set(String(f.difficulty ?? 'undefined'), (difficultyCounts.get(String(f.difficulty ?? 'undefined')) || 0) + 1);
    formatCounts.set(String(f.format ?? 'undefined'), (formatCounts.get(String(f.format ?? 'undefined')) || 0) + 1);
    commitmentCounts.set(String(f.commitmentLevel ?? 'undefined'), (commitmentCounts.get(String(f.commitmentLevel ?? 'undefined')) || 0) + 1);
    for (const t of themes) themeCounts.set(String(t), (themeCounts.get(String(t)) || 0) + 1);
  }

  console.log('feature_version', Object.fromEntries(versionCounts));
  console.log('difficulty', Object.fromEntries(difficultyCounts));
  console.log('format', Object.fromEntries(formatCounts));
  console.log('commitment', Object.fromEntries(commitmentCounts));
  console.log('missing requiredTech', missingReq, 'missing themes', missingThemes);
  console.log('avg requiredTech', (avgReqLen / rows.length).toFixed(2), 'avg themes', (avgThemeLen / rows.length).toFixed(2));
  console.log('top themes', [...themeCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10));

  for (const row of (rows as any[]).slice(0, 8)) {
    const f = row.recommendation_features || {};
    console.log('\n---', row.title);
    console.log('tags', (row.tags||[]).slice(0,8));
    console.log('themes', (f.themes||[]).slice(0,8));
    console.log('requiredTech', (f.requiredTech||[]).slice(0,8));
    console.log('difficulty/format/commitment', f.difficulty, f.format, f.commitmentLevel);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
