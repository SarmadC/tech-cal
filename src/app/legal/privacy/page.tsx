// src/app/legal/privacy/page.tsx

export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 prose prose-invert font-sans-all">
            <h1>Privacy Policy</h1>
            <p>Last updated: September 12, 2025</p>

            <h2>1. Who We Are</h2>
            <p>
                This Privacy Policy describes how <strong>Kure-Cal</strong> (&quot;Kure-Cal&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
                collects, uses, and shares information when you use our website, products, and services (collectively, the &quot;Services&quot;).
                If you have questions, contact us at <a href="mailto:support@kurecal.app">support@kurecal.app</a>.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
                <li>
                    <strong>Account data</strong>: name, email address, password hash, profile preferences, time zone.
                </li>
                <li>
                    <strong>Usage data</strong>: device/browser type, IP address, pages viewed, features used, timestamps, referral URLs.
                </li>
                <li>
                    <strong>Calendar and content</strong>: events you add or import, categories/tags, and related metadata you choose to store in the app.
                </li>
                <li>
                    <strong>Cookies and similar technologies</strong>: essential cookies to operate the Service and optional analytics cookies.
                </li>
                <li>
                    <strong>Payment data</strong>: processed by our payment provider (e.g., card brand, last 4 digits, billing address). We do not store full card numbers.
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
                To exercise rights, contact <a href="mailto:support@kurecal.app">support@kurecal.app</a>. We may verify your identity to process requests.
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
                Email: <a href="mailto:support@kurecal.app">support@kurecal.app</a>
            </p>
        </div>
    );
}