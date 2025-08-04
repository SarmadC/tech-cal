// src/components/emails/ContactFormEmail.tsx
import * as React from 'react';

interface ContactFormEmailProps {
    name: string;
    email: string;
    company?: string;
    subject: string;
    message: string;
}

export const ContactFormEmail: React.FC<Readonly<ContactFormEmailProps>> = ({
    name,
    email,
    company,
    subject,
    message,
}) => (
    <div>
        <h1>New Contact Form Submission</h1>
        <p>You have received a new message from your website`&apos;`s contact form.</p>
        <hr />
        <h2>Message Details:</h2>
        <ul>
            <li><strong>Name:</strong> {name}</li>
            <li><strong>Email:</strong> {email}</li>
            {company && <li><strong>Company:</strong> {company}</li>}
            <li><strong>Subject:</strong> {subject}</li>
        </ul>
        <hr />
        <h2>Message:</h2>
        <p>{message}</p>
    </div>
);