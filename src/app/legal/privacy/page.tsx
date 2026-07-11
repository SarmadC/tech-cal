// src/app/legal/privacy/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

// Static generation for legal pages - static content
export const dynamic = 'force-static';

export const metadata: Metadata = {
    title: 'Privacy Policy - Your Data, Our Commitment',
    description: 'Read the Kure-Cal privacy policy to understand what data we collect, how we use it, and the choices you have to control your personal information and privacy settings.',
    openGraph: {
        title: 'Privacy Policy - Your Data, Our Commitment | Kure-Cal',
        description: 'Read the Kure-Cal privacy policy to understand what data we collect, how we use it, and the choices you have to control your personal information and privacy settings.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Privacy Policy - Your Data, Our Commitment | Kure-Cal',
        description: 'Read the Kure-Cal privacy policy to understand what data we collect, how we use it, and the choices you have to control your personal information and privacy settings.',
    },
};

export default function PrivacyPage() {
    return (
        <main className="max-w-4xl mx-auto py-12 px-4 prose prose-invert font-sans-all">
            <h1>Privacy Policy</h1>
            <p>Last updated: July 9, 2026</p>

            <h2>1. Who We Are</h2>
            <p>
                This Privacy Policy describes how <strong>Kure-Cal</strong> (&quot;Kure-Cal&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
                collects, uses, and shares information when you use our website, products, and services (collectively, the &quot;Services&quot;).
                If you have questions, use our <Link href="/contact">contact form</Link>.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
                <li>
                    <strong>Account data</strong>: name, email address, authentication provider, profile preferences, time zone, and account identifiers. Password credentials are handled by our authentication provider.
                </li>
                <li>
                    <strong>Usage data</strong>: device/browser type, IP address, pages viewed, features used, timestamps, referral URLs.
                </li>
                <li>
                    <strong>Calendar and content</strong>: events you add or import, calendar connection credentials, community posts, comments, reports, images, categories/tags, and related metadata you choose to store in the app.
                </li>
                <li>
                    <strong>Cookies and similar technologies</strong>: essential cookies to operate the Service and optional analytics cookies.
                </li>
                <li>
                    <strong>Mobile device data</strong>: push-notification token, app version, a locally generated device identifier, and approximate location when you ask for nearby results. Device calendar access is used only when you choose to save or remove an event.
                </li>
                <li>
                    <strong>Payment data</strong>: subscription product, purchase status, renewal and expiration information processed by Apple and RevenueCat. We do not receive or store full payment-card numbers.
                </li>
            </ul>

            <h2>3. How We Use Information</h2>
            <ul>
                <li>Provide, maintain, and improve the Services.</li>
                <li>Personalize features (e.g., time zone, view preferences).</li>
                <li>Understand feature adoption and improve performance and reliability.</li>
                <li>Communicate with you (account updates, security notices, support).</li>
                <li>Detect, prevent, and investigate fraud, abuse, or security incidents.</li>
                <li>Comply with legal obligations.</li>
            </ul>

            <h2>4. Legal Bases (EEA/UK Users)</h2>
            <p>We process personal data under the following legal bases, where applicable:</p>
            <ul>
                <li><strong>Contract</strong>: to provide the Services you requested.</li>
                <li><strong>Legitimate interests</strong>: to secure, improve, and market our Services, balanced against your rights.</li>
                <li><strong>Consent</strong>: where required for non‑essential cookies or marketing communications.</li>
                <li><strong>Legal obligation</strong>: to meet regulatory and compliance requirements.</li>
            </ul>

            <h2>5. Sharing and Disclosure</h2>
            <ul>
                <li>
                    <strong>Service providers</strong>: hosting, analytics, error monitoring, email delivery, and payments—only as needed to perform services for us.
                </li>
                <li><strong>Legal and safety</strong>: to comply with laws, enforce our terms, or protect rights, property, or safety.</li>
                <li><strong>Business transfers</strong>: in connection with a merger, acquisition, or asset sale, with appropriate safeguards.</li>
            </ul>
            <p>
                Our principal service providers include Supabase for authentication, database, and file storage; Apple and Google for sign-in and optional calendar connections; RevenueCat and Apple for in-app subscriptions; and Expo for push-notification delivery. Their processing is limited to providing these functions and is governed by their applicable terms and privacy commitments.
            </p>

            <h2>6. Cookies and Tracking</h2>
            <p>
                We use essential cookies to operate the Service and may use analytics cookies to understand usage. You can control cookies in your browser
                settings and, where required, via our cookie preferences. Disabling certain cookies may impact functionality.
            </p>

            <h2>7. Data Retention</h2>
            <p>
                We retain personal data for as long as needed to provide the Services and for legitimate business purposes (e.g., security, backups, legal compliance).
                When data is no longer required, we securely delete or anonymize it.
            </p>

            <h2>8. Security</h2>
            <p>
                We implement administrative, technical, and physical safeguards appropriate to the sensitivity of the data, including encryption in transit,
                access controls, and monitoring. No method of transmission or storage is 100% secure.
            </p>

            <h2>9. Your Rights</h2>
            <p>Your rights may include:</p>
            <ul>
                <li>Access, correction, deletion, and portability of your personal data.</li>
                <li>Objection or restriction to certain processing.</li>
                <li>Withdrawal of consent where processing is based on consent.</li>
            </ul>
            <p>
                To exercise rights, submit a request through our <Link href="/contact">contact form</Link>. We may verify your identity to process requests.
            </p>
            <p>
                Mobile users can initiate permanent account deletion from Settings → Delete account. Deletion removes the Kure-Cal account and associated personal data unless retention is legally required. Deleting Kure-Cal does not cancel an Apple subscription; subscriptions can be cancelled in Apple Account subscription settings.
            </p>

            <h2>10. International Transfers</h2>
            <p>
                If we transfer data internationally, we use appropriate safeguards such as Standard Contractual Clauses and additional measures as needed.
            </p>

            <h2>11. Children’s Privacy</h2>
            <p>
                The Services are not directed to children under 13 (or older as required by local law). If we learn we have collected data from a child,
                we will delete it and take appropriate steps to disable the account.
            </p>

            <h2>12. Changes to This Policy</h2>
            <p>
                We may update this Policy from time to time. We will update the “Last updated” date and, for material changes, provide additional notice
                (e.g., banner or email). Your continued use of the Services after changes indicates acceptance.
            </p>

            <h2>13. Contact Us</h2>
            <p>
                Use our <Link href="/contact">contact form</Link>, or write to support [at] kurecal [dot] app.
            </p>
        </main>
    );
}
