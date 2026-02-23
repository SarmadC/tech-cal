'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DownloadSimple, X } from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/utils/exportUtils';
import { formatDate, formatTime } from '@/utils/dateUtils';
import {
    IMPACT_LABELS,
    SCORE_THRESHOLDS,
    COST_DISPLAY,
    TIME_COMMITMENT,
    ERROR_MESSAGES,
    MARKDOWN_TEMPLATES,
    EMAIL_TEMPLATE,
    UI_STRINGS,
    PRINT_STYLES,
} from './managerJustification.constants';
import { Check } from 'lucide-react';
import type {
    ManagerJustificationData,
    ManagerJustificationResponse as ManagerJustificationApiResponse,
} from '@/types/managerJustification';

interface ManagerJustificationModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ManagerJustificationReportContext {
    managerName: string;
    teamObjective: string;
    expectedDeliverables: string;
    riskMitigation: string;
    followUpDate: string;
    // Editable fields
    eventTitle?: string;
    eventDateString?: string;
    eventLocation?: string;
    eventCost?: string;
    userRole?: string;
    userIndustry?: string;
    executiveSummary?: string;
    eventDuration?: string;
}

const REQUEST_TIMEOUT_MS = 8000;
const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000;
const managerJustificationCache = new Map<
    string,
    { data: ManagerJustificationData; expiresAt: number }
>();
const prefetchInFlight = new Map<string, Promise<void>>();

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

function mergeRedundantReasons(reasons: string[]): string[] {
    const unique = uniqueStrings(reasons);
    const output: string[] = [];
    const skipIndices = new Set<number>();

    for (let i = 0; i < unique.length; i++) {
        if (skipIndices.has(i)) continue;

        const current = unique[i];
        let merged = false;

        // Check for "Learn X"
        const learnMatch = current.match(/^Learn (.+)$/i);
        if (learnMatch) {
            const topic = learnMatch[1].toLowerCase();
            // Look for "Advance X skills"
            for (let j = i + 1; j < unique.length; j++) {
                if (skipIndices.has(j)) continue;
                const advMatch = unique[j].match(/^Advance (.+) skills$/i);
                if (advMatch && advMatch[1].toLowerCase() === topic) {
                    // Combine into "Learn & Advance X skills" using the original topic casing
                    output.push(`Learn & Advance ${learnMatch[1]} skills`);
                    skipIndices.add(j);
                    merged = true;
                    break;
                }
            }
        }

        // Check for "Advance X skills" (if not already merged)
        if (!merged) {
            const advMatch = current.match(/^Advance (.+) skills$/i);
            if (advMatch) {
                const topic = advMatch[1].toLowerCase();
                // Look for "Learn X"
                for (let j = i + 1; j < unique.length; j++) {
                    if (skipIndices.has(j)) continue;
                    const lMatch = unique[j].match(/^Learn (.+)$/i);
                    if (lMatch && lMatch[1].toLowerCase() === topic) {
                        output.push(`Learn & Advance ${advMatch[1]} skills`);
                        skipIndices.add(j);
                        merged = true;
                        break;
                    }
                }
            }
        }

        if (!merged) {
            output.push(current);
        }
    }
    return output;
}

function getCachedManagerJustification(eventId: string): ManagerJustificationData | null {
    const cached = managerJustificationCache.get(eventId);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        managerJustificationCache.delete(eventId);
        return null;
    }
    return cached.data;
}

function setCachedManagerJustification(eventId: string, data: ManagerJustificationData): void {
    managerJustificationCache.set(eventId, {
        data,
        expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
    });
}

export function seedManagerJustificationCache(eventId: string, data: ManagerJustificationData): void {
    setCachedManagerJustification(eventId, data);
}

function parseManagerJustificationPayload(rawBody: string): ManagerJustificationApiResponse | null {
    if (!rawBody) return null;

    try {
        return JSON.parse(rawBody) as ManagerJustificationApiResponse;
    } catch {
        return {
            success: false,
            error: rawBody.trim().slice(0, 200) || undefined,
        };
    }
}

async function fetchManagerJustificationApi(
    eventId: string,
    signal?: AbortSignal
): Promise<{ status: number; payload: ManagerJustificationApiResponse | null }> {
    const response = await fetch(`/api/events/${eventId}/manager-justification`, {
        method: 'GET',
        signal,
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
        },
    });

    const rawBody = await response.text();
    return {
        status: response.status,
        payload: parseManagerJustificationPayload(rawBody),
    };
}

export async function prefetchManagerJustification(eventId: string): Promise<void> {
    if (!eventId || getCachedManagerJustification(eventId)) {
        return;
    }

    const existingRequest = prefetchInFlight.get(eventId);
    if (existingRequest) {
        return existingRequest;
    }

    const request = (async () => {
        const timeoutController = new AbortController();
        const timeoutId = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

        try {
            const { payload, status } = await fetchManagerJustificationApi(eventId, timeoutController.signal);
            if (status >= 200 && status < 300 && payload?.success && payload.data) {
                setCachedManagerJustification(eventId, payload.data);
            }
        } catch {
            // Prefetch is best-effort; ignore background errors.
        } finally {
            window.clearTimeout(timeoutId);
        }
    })().finally(() => {
        prefetchInFlight.delete(eventId);
    });

    prefetchInFlight.set(eventId, request);
    return request;
}

function getImpactLabel(score: number): string {
    if (score >= SCORE_THRESHOLDS.HIGH) return IMPACT_LABELS.HIGH;
    if (score >= SCORE_THRESHOLDS.STRONG) return IMPACT_LABELS.STRONG;
    if (score >= SCORE_THRESHOLDS.GOOD) return IMPACT_LABELS.GOOD;
    return IMPACT_LABELS.FAIR;
}

function getScoreBarClass(score: number): string {
    if (score >= SCORE_THRESHOLDS.HIGH) return 'bg-emerald-500';
    if (score >= SCORE_THRESHOLDS.STRONG) return 'bg-yellow-500';
    return 'bg-orange-500';
}

function getCostDisplay(event: ManagerJustificationData['event']): string {
    if (event.priceRange?.trim()) return event.priceRange;
    if (typeof event.priceMin === 'number' && Number.isFinite(event.priceMin)) {
        return `$${event.priceMin.toLocaleString()}`;
    }
    return COST_DISPLAY.NOT_LISTED;
}

function getTimeCommitment(startTime: string, endTime: string | null): string {
    if (!endTime) return TIME_COMMITMENT.NOT_SPECIFIED;

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return TIME_COMMITMENT.NOT_SPECIFIED;
    }

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return TIME_COMMITMENT.MINUTES(minutes);

    const hours = minutes / 60;
    return TIME_COMMITMENT.HOURS(hours);
}

function getErrorMessage(status: number, fallback?: string): string {
    if (status === 401) return ERROR_MESSAGES.AUTH_REQUIRED;
    if (status === 412) return ERROR_MESSAGES.ONBOARDING_REQUIRED;
    if (status === 404) return ERROR_MESSAGES.EVENT_NOT_FOUND;
    if (status === 422) return fallback || ERROR_MESSAGES.UNABLE_TO_GENERATE;
    if (status === 429) return ERROR_MESSAGES.TOO_MANY_REQUESTS;
    return fallback || ERROR_MESSAGES.GENERIC_FAILURE;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizePrintUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
        return null;
    }
}

function getDefaultFollowUpDate(startTime: string): string {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return '';
    start.setDate(start.getDate() + 7);
    return start.toISOString().slice(0, 10);
}

function getExecutiveSummaryText(
    data: ManagerJustificationData,
    scoreLabel: string,
    context: ManagerJustificationReportContext
): string {
    const role = data.profile.currentRole || 'my current role';
    const objective = context.teamObjective.trim()
        || `Improve delivery outcomes in ${data.profile.industry || 'our domain'}.`;

    return MARKDOWN_TEMPLATES.EXEC_SUMMARY_TEMPLATE
        .replace('{score}', `${Math.round(data.impact.overall)}`)
        .replace('{role}', role)
        .replace('{objective}', objective)
        .replace('{scoreLabel}', scoreLabel);
}

function buildPlainText(
    data: ManagerJustificationData,
    selectedReasons: string[],
    selectedSkills: string[],
    selectedGoals: string[],
    context: ManagerJustificationReportContext
): string {
    const managerName = context.managerName.trim() || '[Manager Name]';
    // Use edited values if provided, otherwise fallback to data
    const eventTitle = context.eventTitle || data.event.title;
    const eventDate = context.eventDateString || `${formatDate(data.event.startTime, data.event.timezone)}${data.event.endTime ? ` – ${formatDate(data.event.endTime, data.event.timezone)}` : ''}`;
    const eventLocation = context.eventLocation || data.event.location || 'Online';

    // Construct the email body
    const lines: string[] = [];

    // Subject Line (optional, but good for copy-paste)
    lines.push(`Subject: ${EMAIL_TEMPLATE.SUBJECT.replace('{eventName}', eventTitle)}`);
    lines.push('');

    // Opening
    lines.push(EMAIL_TEMPLATE.OPENING.replace('{managerName}', managerName));
    lines.push('');

    // Event Details
    lines.push(
        EMAIL_TEMPLATE.EVENT_DETAILS
            .replace('{eventName}', eventTitle)
            .replace('{dateRange}', eventDate)
            .replace('{location}', eventLocation)
    );
    lines.push('');

    // Reasons
    if (selectedReasons.length > 0) {
        lines.push(EMAIL_TEMPLATE.REASONS_HEADER);
        lines.push('');
        selectedReasons.forEach(reason => {
            // Transform reason to "Header: Body" format if possible, or just bullet
            // The existing reasons are simple strings. We will format them as bullets.
            lines.push(`• ${reason}`);
        });
        lines.push('');
    }

    // Skills (Optional addition to reasons)
    if (selectedSkills.length > 0) {
        // Filter redudant skills logic could be applied here too if reused
        const visibleSkills = selectedSkills.filter(skill => {
            const lowerSkill = skill.toLowerCase();
            return !selectedReasons.some(reason => reason.toLowerCase().includes(lowerSkill));
        });

        if (visibleSkills.length > 0) {
            lines.push('Additionally, I plan to target specific skills:');
            visibleSkills.forEach(skill => lines.push(`• ${skill}`));
            lines.push('');
        }
    }

    // Closing
    lines.push(EMAIL_TEMPLATE.CLOSING.replace('{eventName}', eventTitle));

    return lines.join('\n');
}

function buildPrintableHtml(
    data: ManagerJustificationData,
    selectedReasons: string[],
    selectedSkills: string[],
    selectedGoals: string[],
    context: ManagerJustificationReportContext
): string {
    const generatedDate = formatDate(new Date().toISOString());
    // Use edited values if provided
    const eventTitle = context.eventTitle || data.event.title;
    const eventDate = context.eventDateString || `${formatDate(data.event.startTime, data.event.timezone)} ${data.event.endTime ? `- ${formatDate(data.event.endTime, data.event.timezone)}` : ''}`;
    const eventLocation = context.eventLocation || data.event.location || 'Online';
    const eventOrganizer = data.event.organizer; // Not currently editable in plan
    const cost = context.eventCost || getCostDisplay(data.event);

    // Use editable duration if available, otherwise calculate default
    const timeCommitment = context.eventDuration || getTimeCommitment(data.event.startTime, data.event.endTime);

    const score = Math.round(data.impact.overall);
    const confidence = Math.round(data.impact.confidence * 100);
    const scoreLabel = getImpactLabel(data.impact.overall);

    // Use editable executive summary directly if available
    const executiveSummary = context.executiveSummary || getExecutiveSummaryText(data, scoreLabel, context);

    const managerName = context.managerName.trim() || 'Manager';
    const teamObjective = context.teamObjective.trim()
        || `Advance ${data.profile.currentRole || 'team'} outcomes in ${data.profile.industry || 'our domain'}.`;
    const riskMitigation = context.riskMitigation.trim()
        || 'Coverage and priorities will be coordinated so delivery commitments are maintained.';
    const followUpDate = context.followUpDate
        ? formatDate(context.followUpDate)
        : 'within one week after the event';
    const deliverables = context.expectedDeliverables
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    // Filter skills that are already mentioned in the reasons to avoid redundancy
    const visibleSkills = selectedSkills.filter(skill => {
        const lowerSkill = skill.toLowerCase();
        return !selectedReasons.some(reason => reason.toLowerCase().includes(lowerSkill));
    });

    const reasonList = selectedReasons
        .map((reason) => `<li class="bulleted">${escapeHtml(reason)}</li>`)
        .join('');
    const skillsList = visibleSkills
        .map((skill) => `<li class="bulleted">${escapeHtml(skill)}</li>`)
        .join('');
    const safeRegistrationUrl = sanitizePrintUrl(data.event.registrationUrl ?? null);

    // Generate Email Content for the Print View
    const emailSubject = EMAIL_TEMPLATE.SUBJECT.replace('{eventName}', eventTitle);
    const emailOpening = EMAIL_TEMPLATE.OPENING.replace('{managerName}', managerName);
    const emailEventDetails = EMAIL_TEMPLATE.EVENT_DETAILS
        .replace('{eventName}', eventTitle)
        .replace('{dateRange}', eventDate)
        .replace('{location}', eventLocation);

    // Build email body paragraphs
    let emailBodyHtml = `<p>${escapeHtml(emailOpening)}</p>`;
    emailBodyHtml += `<p>${escapeHtml(emailEventDetails)}</p>`;

    if (selectedReasons.length > 0) {
        emailBodyHtml += `<p>${escapeHtml(EMAIL_TEMPLATE.REASONS_HEADER)}</p>`;
        emailBodyHtml += `<ul>${selectedReasons.map(r => `<li class="bulleted">${escapeHtml(r)}</li>`).join('')}</ul>`;
    }

    if (visibleSkills.length > 0) {
        emailBodyHtml += `<p>Additionally, I plan to target specific skills:</p>`;
        emailBodyHtml += `<ul>${visibleSkills.map(s => `<li class="bulleted">${escapeHtml(s)}</li>`).join('')}</ul>`;
    }

    emailBodyHtml += `<p>${escapeHtml(EMAIL_TEMPLATE.CLOSING.replace('{eventName}', eventTitle))}</p>`;


    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(eventTitle)} - Manager Justification</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${PRINT_STYLES}
        </style>
      </head>
      <body>
        <!-- Email Section -->
        <div class="email-container">
            <div class="email-header">
                <div class="email-meta"><strong>To:</strong> ${escapeHtml(managerName)}</div>
                <div class="email-meta"><strong>Subject:</strong> ${escapeHtml(emailSubject)}</div>
            </div>
            <div class="email-body">
                ${emailBodyHtml}
            </div>
        </div>
        <div class="cut-line">Start of Attachment</div>

        <div style="height: 40px;"></div>

        <!-- Header -->
        <div class="header-bg">
            <div class="header-grid">
                <div>
                    <div class="header-name">${escapeHtml(eventTitle)}</div>
                    <div class="header-title">Event Attendance Request</div>
                </div>
                <div class="header-contact">
                    <div>Prepared for: ${escapeHtml(managerName)}</div>
                    <div>${escapeHtml(generatedDate)}</div>
                </div>
            </div>
        </div>

        <!-- Executive Summary -->
        <div class="cv-row">
            <div class="cv-label">Summary</div>
            <div class="cv-content">
                <p>${escapeHtml(executiveSummary)}</p>
            </div>
        </div>

        <!-- Event Details -->
        <div class="cv-row">
            <div class="cv-label">Event</div>
            <div class="cv-content">
                <div class="data-grid">
                   <div class="data-item">
                        <div class="data-label">${UI_STRINGS.LABEL_DATE}</div>
                        <div class="data-value" style="font-weight:400;">${escapeHtml(eventDate)}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">${UI_STRINGS.LABEL_LOCATION}</div>
                        <div class="data-value" style="font-weight:400;">${escapeHtml(eventLocation)}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">${UI_STRINGS.LABEL_ORGANIZER}</div>
                        <div class="data-value" style="font-weight:400;">${escapeHtml(eventOrganizer)}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">${UI_STRINGS.LABEL_COST}</div>
                        <div class="data-value" style="font-weight:400;">${escapeHtml(cost)}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Impact -->
        <div class="cv-row">
            <div class="cv-label">Impact</div>
            <div class="cv-content">
                 <div style="margin-bottom: 16px;">
                    <span class="score-large">${score}/100</span>
                    <span class="score-meta">${escapeHtml(scoreLabel)} · ${confidence}% Confidence</span>
                 </div>
                 ${selectedReasons.length > 0 ? `
                 <div style="margin-bottom: 24px;">
                    <h2>${UI_STRINGS.WHY_MATTERS}</h2>
                    <ul>${reasonList}</ul>
                 </div>` : ''}
                 
                 ${visibleSkills.length > 0 ? `
                 <div>
                    <h2>${UI_STRINGS.SKILLS_DEVELOPMENT}</h2>
                    <ul>${skillsList}</ul>
                 </div>` : ''}
            </div>
        </div>

        <!-- Investment & Risk -->
        <div class="cv-row">
            <div class="cv-label">Plan</div>
            <div class="cv-content">
                <div style="margin-bottom: 24px;">
                    <h2 style="margin-bottom: 8px;">Investment</h2>
                    <p style="font-size: 13px;">${UI_STRINGS.ESTIMATED_COST} <strong>${escapeHtml(cost)}</strong> &nbsp;•&nbsp; ${UI_STRINGS.ESTIMATED_TIME} <strong>${escapeHtml(timeCommitment)}</strong></p>
                    ${safeRegistrationUrl ? `<p style="margin-top: 4px; font-size: 12px;"><a href="${escapeHtml(safeRegistrationUrl)}">Registration Link</a></p>` : ''}
                </div>
                
                <div style="margin-bottom: 24px;">
                    <h2 style="margin-bottom: 8px;">Deliverables</h2>
                    <ul>
                        ${deliverables.length > 0
            ? deliverables.map((line) => `<li class="bulleted">${escapeHtml(line)}</li>`).join('')
            : '<li class="bulleted">Share a concise recap with key takeaways.</li>'
        }
                    </ul>
                </div>

                <div>
                    <h2 style="margin-bottom: 8px;">Risk Mitigation</h2>
                    <p>${escapeHtml(riskMitigation)}</p>
                </div>
            </div>
        </div>

        <div class="cv-row" style="margin-bottom: 0;">
            <div class="cv-label">Action</div>
            <div class="cv-content">
                <p><strong>Approval Request:</strong> ${escapeHtml(MARKDOWN_TEMPLATES.APPROVAL_REQUEST_TEMPLATE.replace('{followUpDate}', followUpDate))}</p>
            </div>
        </div>
      </body>
    </html>
  `;
}

export default function ManagerJustificationModal({
    eventId,
    isOpen,
    onClose,
}: ManagerJustificationModalProps) {
    const [data, setData] = useState<ManagerJustificationData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
    const [requestNonce, setRequestNonce] = useState(0);
    const [managerName, setManagerName] = useState('');
    const [teamObjective, setTeamObjective] = useState('');
    const [expectedDeliverables, setExpectedDeliverables] = useState('');
    const [riskMitigation, setRiskMitigation] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    // meaningful defaults
    const [eventTitle, setEventTitle] = useState('');
    const [eventDateString, setEventDateString] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventCost, setEventCost] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userIndustry, setUserIndustry] = useState('');
    const [executiveSummary, setExecutiveSummary] = useState('');
    const [eventDuration, setEventDuration] = useState('');

    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setIsLoading(false);
            return;
        }

        const cachedData = getCachedManagerJustification(eventId);
        if (cachedData) {
            setData(cachedData);
            setSelectedReasons(mergeRedundantReasons(cachedData.impact.topReasons));
            setSelectedSkills(uniqueStrings(cachedData.impact.matchedSkills));
            setSelectedGoals(uniqueStrings(cachedData.impact.matchedGoals));
            setManagerName('');
            setTeamObjective(
                `Apply insights to ${cachedData.profile.currentRole || 'team'} priorities in ${cachedData.profile.industry || 'our domain'}.`
            );
            setExpectedDeliverables(
                'Comprehensive Event Report & Key Takeaways\nTechnical Strategy Doc (with 2-3 immediate implementation candidates)\nTeam Workshop / Brown Bag Session'
            );
            setRiskMitigation('Coverage and project priorities are planned to prevent delivery risk during attendance.');
            setFollowUpDate(getDefaultFollowUpDate(cachedData.event.startTime));

            // Initialize editable fields
            setEventTitle(cachedData.event.title);
            setEventDateString(`${formatDate(cachedData.event.startTime, cachedData.event.timezone)} ${cachedData.event.endTime ? `- ${formatDate(cachedData.event.endTime, cachedData.event.timezone)}` : ''}`);
            setEventLocation(cachedData.event.location || '');
            setEventCost(getCostDisplay(cachedData.event));
            setEventDuration(getTimeCommitment(cachedData.event.startTime, cachedData.event.endTime));
            setUserRole(cachedData.profile.currentRole || '');
            setUserIndustry(cachedData.profile.industry || '');

            // Smart Defaults
            if (cachedData.event.endTime) {
                // Default follow-up date to 3 days after event ends
                const endDate = new Date(cachedData.event.endTime);
                if (!isNaN(endDate.getTime())) {
                    endDate.setDate(endDate.getDate() + 3);
                    setFollowUpDate(endDate.toISOString().split('T')[0]);
                }
            }

            // Try to load last used manager name from localStorage (feature request)
            const lastManager = localStorage.getItem('tech-cal-last-manager');
            if (lastManager) setManagerName(lastManager);

            // We need to calculate the initial executive summary based on the fetched data
            // Note: This relies on the helper using the *initial* values. 
            // Since we are setting state here, we can use the helper with the data object directly as a starting point.
            // But we want the *editable* summary to be potentially independent after init.
            const initialScoreLabel = getImpactLabel(cachedData.impact.overall);
            const initialSummary = getExecutiveSummaryText(cachedData, initialScoreLabel, {
                managerName: '',
                teamObjective: `Apply insights to ${cachedData.profile.currentRole || 'team'} priorities in ${cachedData.profile.industry || 'our domain'}.`,
                expectedDeliverables: '', // Context not fully needed for summary generation in this helper's current form?
                riskMitigation: '',
                followUpDate: ''
            });
            setExecutiveSummary(initialSummary);

            setError(null);
            setIsLoading(false);
            setCopyStatus('idle');
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsLoading(true);
        setError(null);
        setCopyStatus('idle');

        const fetchData = async () => {
            const timeoutId = window.setTimeout(() => {
                controller.abort();
                if (!isMountedRef.current) return;
                if (abortControllerRef.current !== controller) return;
                setError(ERROR_MESSAGES.TIMEOUT);
                setData(null);
                setIsLoading(false);
                abortControllerRef.current = null;
            }, REQUEST_TIMEOUT_MS);

            try {
                const { status, payload } = await fetchManagerJustificationApi(eventId, controller.signal);

                if (status < 200 || status >= 300 || !payload?.success || !payload?.data) {
                    const nextError = getErrorMessage(status, payload?.error);
                    if (isMountedRef.current) {
                        setError(nextError);
                        setData(null);
                        setIsLoading(false);
                    }
                    return;
                }

                if (!isMountedRef.current) return;

                setData(payload.data);
                setCachedManagerJustification(eventId, payload.data);
                setSelectedReasons(mergeRedundantReasons(payload.data.impact.topReasons));
                setSelectedSkills(uniqueStrings(payload.data.impact.matchedSkills));
                setSelectedGoals(uniqueStrings(payload.data.impact.matchedGoals));
                setManagerName('');
                setTeamObjective(
                    `Apply insights to ${payload.data.profile.currentRole || 'team'} priorities in ${payload.data.profile.industry || 'our domain'}.`
                );
                setExpectedDeliverables(
                    'Comprehensive Event Report & Key Takeaways\nTechnical Strategy Doc (with 2-3 immediate implementation candidates)\nTeam Workshop / Brown Bag Session'
                );
                setRiskMitigation('Coverage and project priorities are planned to prevent delivery risk during attendance.');
                setFollowUpDate(getDefaultFollowUpDate(payload.data.event.startTime));

                // Initialize editable fields
                setEventTitle(payload.data.event.title);
                setEventDateString(`${formatDate(payload.data.event.startTime, payload.data.event.timezone)} ${payload.data.event.endTime ? `- ${formatDate(payload.data.event.endTime, payload.data.event.timezone)}` : ''}`);
                setEventLocation(payload.data.event.location || '');
                setEventCost(getCostDisplay(payload.data.event));
                setEventDuration(getTimeCommitment(payload.data.event.startTime, payload.data.event.endTime));
                setUserRole(payload.data.profile.currentRole || '');
                setUserIndustry(payload.data.profile.industry || '');

                // Smart Defaults (API Fetch)
                if (payload.data.event.endTime) {
                    const endDate = new Date(payload.data.event.endTime);
                    if (!isNaN(endDate.getTime())) {
                        endDate.setDate(endDate.getDate() + 3);
                        setFollowUpDate(endDate.toISOString().split('T')[0]);
                    }
                }
                const lastManager = localStorage.getItem('tech-cal-last-manager');
                if (lastManager) setManagerName(lastManager);

                const initialScoreLabel = getImpactLabel(payload.data.impact.overall);
                const initialSummary = getExecutiveSummaryText(payload.data, initialScoreLabel, {
                    managerName: '',
                    teamObjective: `Apply insights to ${payload.data.profile.currentRole || 'team'} priorities in ${payload.data.profile.industry || 'our domain'}.`,
                    expectedDeliverables: '',
                    riskMitigation: '',
                    followUpDate: ''
                });
                setExecutiveSummary(initialSummary);
            } catch (fetchError) {
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    return;
                }
                if (isMountedRef.current) {
                    setError(ERROR_MESSAGES.GENERIC_FAILURE);
                    setData(null);
                }
            } finally {
                window.clearTimeout(timeoutId);
                if (isMountedRef.current && abortControllerRef.current === controller) {
                    setIsLoading(false);
                    abortControllerRef.current = null;
                }
            }
        };

        void fetchData();
    }, [eventId, isOpen, requestNonce]);

    useEffect(() => {
        if (copyStatus === 'idle') return;
        const timeout = window.setTimeout(() => setCopyStatus('idle'), 2000);
        return () => window.clearTimeout(timeout);
    }, [copyStatus]);

    const scoreLabel = useMemo(() => {
        if (!data) return '';
        return getImpactLabel(data.impact.overall);
    }, [data]);

    const eventDateLine = useMemo(() => {
        if (!data) return '';
        const start = `${formatDate(data.event.startTime, data.event.timezone)} at ${formatTime(data.event.startTime, data.event.timezone)}`;
        if (!data.event.endTime) return start;
        return `${start} - ${formatTime(data.event.endTime, data.event.timezone)}`;
    }, [data]);

    const handleReasonToggle = (reason: string) => {
        setSelectedReasons((prev) =>
            prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason]
        );
    };

    const handleCopy = async () => {
        if (!data) return;
        const text = buildPlainText(data, selectedReasons, selectedSkills, selectedGoals, {
            managerName,
            teamObjective,
            expectedDeliverables,
            riskMitigation,
            followUpDate,
            // Pass edited values overrides
            eventTitle,
            eventDateString,
            eventLocation,
            eventCost,
            userRole,
            userIndustry,
            executiveSummary,
            eventDuration
        });

        // Save manager name for next time
        if (managerName) localStorage.setItem('tech-cal-last-manager', managerName);

        const success = await copyToClipboard(text);
        setCopyStatus(success ? 'copied' : 'error');
    };

    const handleDownloadPdf = () => {
        if (!data) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setCopyStatus('error');
            return;
        }

        const content = buildPrintableHtml(data, selectedReasons, selectedSkills, selectedGoals, {
            managerName,
            teamObjective,
            expectedDeliverables,
            riskMitigation,
            followUpDate,
            // Pass edited values overrides
            eventTitle,
            eventDateString,
            eventLocation,
            eventCost,
            userRole,
            userIndustry,
            executiveSummary,
            eventDuration
        });

        if (managerName) localStorage.setItem('tech-cal-last-manager', managerName);

        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 200);
    };




    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-6xl h-[85vh] p-0 gap-0 grid-rows-[auto,1fr,auto] bg-[#18181B] border-[rgba(255,255,255,0.06)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:rounded-xl">
                <DialogHeader className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-[14px] font-medium text-white">{UI_STRINGS.TITLE_REQUEST}</DialogTitle>
                        <DialogDescription className="sr-only">{UI_STRINGS.DIALOG_DESCRIPTION}</DialogDescription>
                        <span className="text-[12px] text-zinc-500 font-normal">
                            {formatDate(new Date().toISOString())}
                        </span>
                    </div>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] overflow-hidden">
                    {/* Left Pane: Composer */}
                    <div className="flex flex-col h-full overflow-hidden border-r border-[rgba(255,255,255,0.06)] bg-[#101012]">
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {isLoading && (
                                <div className="text-sm text-zinc-500" data-testid="manager-justification-loading">
                                    {UI_STRINGS.LOADING}
                                </div>
                            )}

                            {!isLoading && error && (
                                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                                    <p>{error}</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => {
                                            setError(null);
                                            setData(null);
                                            setIsLoading(true);
                                            setRequestNonce((prev) => prev + 1);
                                        }}
                                        className="mt-2 h-auto p-0 text-[#ef4444] underline hover:text-[#dc2626]"
                                    >
                                        {UI_STRINGS.TRY_AGAIN}
                                    </Button>
                                </div>
                            )}

                            {!isLoading && !error && data && (
                                <>
                                    {/* Step 1: Approval Context */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-5 w-5 rounded-full bg-[#5E6AD2] flex items-center justify-center text-[10px] font-bold text-white">1</div>
                                            <h3 className="text-[13px] font-medium text-zinc-100">Approval Context</h3>
                                        </div>
                                        <div className="space-y-4 pl-7 border-l border-[rgba(255,255,255,0.06)] ml-2.5">
                                            <label className="block space-y-1.5">
                                                <span className="text-[11px] font-medium text-zinc-400">Manager Name</span>
                                                <input
                                                    type="text"
                                                    value={managerName}
                                                    onChange={(event) => setManagerName(event.target.value)}
                                                    placeholder="Who is approving this?"
                                                    className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all"
                                                />
                                            </label>
                                            <label className="block space-y-1.5">
                                                <span className="text-[11px] font-medium text-zinc-400">Team Goal Alignment</span>
                                                <textarea
                                                    value={teamObjective}
                                                    onChange={(event) => setTeamObjective(event.target.value)}
                                                    placeholder="Which team goal does this support?"
                                                    rows={2}
                                                    className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all resize-none"
                                                />
                                            </label>
                                        </div>
                                    </section>

                                    {/* Step 2: Event Impact */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-5 w-5 rounded-full bg-[#5E6AD2] flex items-center justify-center text-[10px] font-bold text-white">2</div>
                                            <h3 className="text-[13px] font-medium text-zinc-100">Event Impact</h3>
                                        </div>
                                        <div className="space-y-4 pl-7 border-l border-[rgba(255,255,255,0.06)] ml-2.5">
                                            <label className="block space-y-1.5">
                                                <span className="text-[11px] font-medium text-zinc-400">Summary Pitch ({scoreLabel})</span>
                                                <textarea
                                                    value={executiveSummary}
                                                    onChange={(e) => setExecutiveSummary(e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-[rgba(255,255,255,0.03)] rounded-md border border-[rgba(255,255,255,0.08)] focus:border-[#5E6AD2] focus:bg-[rgba(255,255,255,0.05)] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none transition-all resize-none"
                                                />
                                            </label>

                                            {/* Skills Tags */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-medium text-zinc-400 block">Skills you will gain</span>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Custom Skill Input */}
                                                    <input
                                                        type="text"
                                                        placeholder="Add a skill (press Enter)..."
                                                        className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const value = e.currentTarget.value.trim();
                                                                if (value && !selectedSkills.includes(value)) {
                                                                    setSelectedSkills(prev => [...prev, value]);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />

                                                    {selectedSkills.length === 0 ? (
                                                        <p className="text-[13px] text-zinc-500 italic">No skills selected</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedSkills.map((skill) => (
                                                                <button
                                                                    key={skill}
                                                                    type="button"
                                                                    onClick={() => setSelectedSkills((prev) => prev.filter((value) => value !== skill))}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-transparent hover:border-[rgba(255,255,255,0.1)] text-[11px] text-zinc-300 transition-all group"
                                                                >
                                                                    {skill}
                                                                    <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Step 3: Investment */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-5 w-5 rounded-full bg-[#5E6AD2] flex items-center justify-center text-[10px] font-bold text-white">3</div>
                                            <h3 className="text-[13px] font-medium text-zinc-100">Investment & Return</h3>
                                        </div>
                                        <div className="space-y-4 pl-7 border-l border-transparent ml-2.5">
                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="block space-y-1.5">
                                                    <span className="text-[11px] font-medium text-zinc-400">Est. Cost</span>
                                                    <input
                                                        type="text"
                                                        value={eventCost}
                                                        onChange={(e) => setEventCost(e.target.value)}
                                                        className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all"
                                                    />
                                                </label>
                                                <label className="block space-y-1.5">
                                                    <span className="text-[11px] font-medium text-zinc-400">Time Req.</span>
                                                    <input
                                                        type="text"
                                                        value={eventDuration}
                                                        onChange={(e) => setEventDuration(e.target.value)}
                                                        className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all"
                                                    />
                                                </label>
                                            </div>

                                            <label className="block space-y-1.5">
                                                <span className="text-[11px] font-medium text-zinc-400">Deliverables</span>
                                                <textarea
                                                    value={expectedDeliverables}
                                                    onChange={(event) => setExpectedDeliverables(event.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[rgba(94,106,210,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all resize-none"
                                                />
                                            </label>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Live Preview */}
                    <div className="hidden lg:block bg-[#1C1C1F] overflow-y-auto p-8 border-l border-[rgba(255,255,255,0.06)] relative">
                        <div className="absolute top-4 right-6 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                            Live Preview
                        </div>

                        <div className="max-w-[600px] mx-auto bg-white rounded-sm shadow-sm min-h-[800px] p-8 text-[#111827]">
                            {/* We will render the HTML preview here using an iframe or direct dangerousHTML? 
                                 Rendering full HTML in a div might break styles if we don't scope it. 
                                 Better to use a simplified React render of the "Attachment" view for the visual preview.
                              */}
                            {data && (
                                <div className="space-y-6 font-['Inter',sans-serif]">
                                    {/* Email Header Style Preview */}
                                    <div className="border-b border-dashed border-gray-200 pb-6 mb-6">
                                        <div className="text-xs text-gray-500 font-mono mb-2">Subject: {EMAIL_TEMPLATE.SUBJECT.replace('{eventName}', eventTitle || data.event.title)}</div>
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                            {EMAIL_TEMPLATE.OPENING.replace('{managerName}', managerName || '[Manager]')}
                                            {"\n\n"}
                                            {EMAIL_TEMPLATE.EVENT_DETAILS
                                                .replace('{eventName}', eventTitle || data.event.title)
                                                .replace('{dateRange}', eventDateString || '')
                                                .replace('{location}', eventLocation || '')
                                            }
                                        </div>
                                    </div>

                                    {/* CV Header */}
                                    <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                                        <div>
                                            <h1 className="text-xl font-bold text-gray-900">{eventTitle || data.event.title}</h1>
                                            <div className="text-sm text-gray-500">Event Attendance Request</div>
                                        </div>
                                        <div className="text-right text-xs text-gray-400">
                                            <div>{formatDate(new Date().toISOString())}</div>
                                        </div>
                                    </div>

                                    {/* Event Overview in Preview */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-700 border-b border-gray-100 pb-6">
                                        <div>
                                            <span className="block text-xs text-gray-400 font-semibold mb-1">When</span>
                                            {eventDateString}
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400 font-semibold mb-1">Where</span>
                                            {eventLocation}
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400 font-semibold mb-1">Format</span>
                                            {data.event.eventFormat || 'Conference'}
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400 font-semibold mb-1">Organizer</span>
                                            {data.event.organizer}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-400 mb-2">Executive Summary</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {executiveSummary || 'No summary generated yet.'}
                                        </p>
                                    </div>

                                    {/* ROI/Reasons */}
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-400 mb-2">Strategic Value</h3>
                                        {selectedReasons.length > 0 ? (
                                            <ul className="list-disc pl-4 space-y-1">
                                                {selectedReasons.map(r => (
                                                    <li key={r} className="text-sm text-gray-700">{r}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No strategic value points selected</p>
                                        )}
                                    </div>

                                    {/* Skills (New in Preview) */}
                                    {selectedSkills.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-400 mb-2">Skills Acquisition</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedSkills.map(s => (
                                                    <span key={s} className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Investment */}
                                    {/* ... keeping existing investment block logic but maybe refining style ... */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-100">
                                        <h3 className="text-xs font-semibold text-gray-500 mb-2">Resource Requirements</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                            <div>
                                                <span className="text-gray-500 block text-xs">Budget</span>
                                                <span className="font-medium text-gray-900">{eventCost}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block text-xs">Time Away</span>
                                                <span className="font-medium text-gray-900">{eventDuration}</span>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-gray-200">
                                            <span className="text-gray-500 block text-xs mb-1">Deliverables</span>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                {expectedDeliverables || 'Standard event report and team share-out.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#18181B] flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4">
                    <div className="text-[11px] text-zinc-500">
                        {UI_STRINGS.NOT_SPECIFIED === 'TBD' ? <span>Refines over time</span> : null}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={handleCopy}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.05)] text-[13px] h-9 px-4"
                        >
                            {copyStatus === 'copied' ? (
                                <span className="flex items-center gap-2 text-green-400">
                                    <Check size={14} /> {UI_STRINGS.COPIED}
                                </span>
                            ) : (
                                UI_STRINGS.COPY_CLIPBOARD
                            )}
                        </Button>
                        <Button
                            onClick={handleDownloadPdf}
                            className="bg-[#5E6AD2] hover:bg-[#4e5ac0] text-white text-[13px] font-medium h-9 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)]"
                        >
                            <DownloadSimple size={14} className="mr-2" />
                            {UI_STRINGS.DOWNLOAD_PDF}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
