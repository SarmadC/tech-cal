import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FirecrawlSiteAnalyzer, type ScheduleLinkDetail } from '@/services/ingestion/FirecrawlSiteAnalyzer';

interface TargetEvent {
    name: string;
    url: string;
    registrationUrl?: string | null;
}

interface ScheduleSampleOutput {
    name: string;
    url: string;
    analyzedAt: string;
    isMultiTrack: boolean;
    scheduleHints: string[];
    priorityPages: string[];
    scheduleLinks: string[];
    scheduleLinkDetails: ScheduleLinkDetail[];
}

async function collectSamples(targets: TargetEvent[]): Promise<ScheduleSampleOutput[]> {
    const samples: ScheduleSampleOutput[] = [];

    for (const target of targets) {
        // eslint-disable-next-line no-console
        console.log(`Analyzing schedule links for ${target.name} (${target.url})...`);
        try {
            const analysis = await FirecrawlSiteAnalyzer.analyze(target.url, target.registrationUrl ?? undefined, {});
            samples.push({
                name: target.name,
                url: target.url,
                analyzedAt: new Date().toISOString(),
                isMultiTrack: analysis.isMultiTrack,
                scheduleHints: analysis.scheduleHints,
                priorityPages: analysis.priorityPages,
                scheduleLinks: analysis.scheduleLinks,
                scheduleLinkDetails: analysis.scheduleLinkDetails,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Failed to analyze ${target.name}:`, error);
        }
    }

    return samples;
}

async function main() {
    const targets: TargetEvent[] = [
        {
            name: 'SaaStr Annual',
            url: 'https://www.saastrannual.com',
        },
        {
            name: 'Collision Conference',
            url: 'https://vancouver.websummit.com',
        },
        {
            name: 'Money 20/20 USA',
            url: 'https://us.money2020.com',
        },
    ];

    const samples = await collectSamples(targets);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outputPath = path.resolve(__dirname, '../context/schedule-samples.json');

    const outputPayload = {
        generatedAt: new Date().toISOString(),
        samples,
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2));

    // eslint-disable-next-line no-console
    console.log(`Wrote schedule samples to ${outputPath}`);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to collect schedule samples', error);
    process.exit(1);
});
