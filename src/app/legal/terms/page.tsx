// src/app/legal/terms/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

// Static generation for legal pages - static content
export const dynamic = 'force-static';

export const metadata: Metadata = {
    title: 'Terms of Service - Account Rules & Policies',
    description: 'Review the Kure-Cal terms of service covering account rules, acceptable use policies, billing details, and your rights and responsibilities as a customer.',
    openGraph: {
        title: 'Terms of Service - Account Rules & Policies | Kure-Cal',
        description: 'Review the Kure-Cal terms of service covering account rules, acceptable use policies, billing details, and your rights and responsibilities as a customer.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Terms of Service - Account Rules & Policies | Kure-Cal',
        description: 'Review the Kure-Cal terms of service covering account rules, acceptable use policies, billing details, and your rights and responsibilities as a customer.',
    },
};

export default function TermsOfServicePage() {
    return (
        <main className="max-w-4xl mx-auto py-12 px-4 prose prose-invert font-sans-all">
            <h1>Terms of Service</h1>
            <p>Last updated: July 9, 2026</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing or using Kure-Cal (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree, do not use the Service. We may update these Terms from time to time; continued use indicates acceptance.
            </p>

            <h2>2. Eligibility and Accounts</h2>
            <ul>
                <li>You must be at least 13 years old (or older as required by local law).</li>
                <li>You are responsible for safeguarding your account credentials and for activities under your account.</li>
                <li>Provide accurate information and notify us of unauthorized use immediately.</li>
            </ul>

            <h2>3. Permitted Use</h2>
            <p>You agree not to misuse the Service. For example, you will not:</p>
            <ul>
                <li>Violate any laws or third‑party rights.</li>
                <li>Reverse engineer, decompile, or attempt to access source code except as permitted by law.</li>
                <li>Interfere with or disrupt the Service, or access it using automated means without consent.</li>
                <li>Upload unlawful, harmful, or infringing content.</li>
            </ul>

            <h2>4. User Content</h2>
            <p>
                You retain ownership of content you submit to the Service. You grant Kure-Cal a worldwide, non‑exclusive, royalty‑free license
                to host, store, display, and process your content solely to operate and improve the Service.
            </p>

            <h2>5. Subscriptions, Billing, and Refunds</h2>
            <ul>
                <li>Fees, billing cycles, and plan details are presented at checkout and may change with notice.</li>
                <li>Trials, renewals, cancellations, and refunds (if any) are governed by the plan terms at purchase.</li>
                <li>Taxes may apply based on your location.</li>
            </ul>

            <h2>6. Intellectual Property</h2>
            <p>
                Kure-Cal, including its logos, trademarks, and software, is our intellectual property or that of our licensors. We grant you a
                limited, non‑transferable, revocable license to access and use the Service in accordance with these Terms.
            </p>

            <h2>7. Third‑Party Services</h2>
            <p>
                The Service may link to or integrate with third‑party services (e.g., analytics, payments). We do not control and are not responsible for
                third‑party services; their terms and privacy policies govern your use of them.
            </p>

            <h2>8. Disclaimers</h2>
            <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON‑INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR‑FREE.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, KURE‑CAL AND ITS AFFILIATES WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES. OUR TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNTS
                PAID BY YOU TO US FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>

            <h2>10. Indemnification</h2>
            <p>You agree to indemnify and hold Kure‑Cal harmless from claims arising out of your use of the Service or violation of these Terms.</p>

            <h2>11. Termination</h2>
            <p>
                We may suspend or terminate your access if you violate these Terms or if needed to protect the Service. Upon termination, your right to
                use the Service ceases. We may retain certain information as required by law or for legitimate business purposes.
            </p>

            <h2>12. Governing Law and Dispute Resolution</h2>
            <p>
                These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada applicable there,
                excluding conflict-of-law principles. Unless consumer-protection law requires otherwise, disputes will be resolved
                exclusively by the courts located in Alberta, Canada.
            </p>

            <h2>13. Changes</h2>
            <p>
                We may modify these Terms from time to time. We will update the “Last updated” date and, for material changes, provide additional notice.
            </p>

            <h2>14. Contact</h2>
            <p>
                Use our <Link href="/contact">contact form</Link>, or write to support [at] kurecal [dot] app.
            </p>
        </main>
    );
}
