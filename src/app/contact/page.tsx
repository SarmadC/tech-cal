// src/app/contact/page.tsx

'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: ''
  });

  const handleSubmit = () => {
    // Handle form submission
    console.log('Form submitted:', formData);
    // Show success message
    alert('Thank you for contacting us! We\'ll get back to you within 24 hours.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background-main pt-20">
      {/* Header */}
      <section className="py-16 px-4 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl">
            Have questions about TechCalendar? Want to discuss enterprise plans? 
            We're here to help.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold text-foreground-primary mb-6">
              Let's Build Something Together
            </h2>
            <p className="text-foreground-secondary mb-8">
              Whether you're a developer with feedback, a company looking for custom solutions, 
              or an investor interested in our vision, we'd love to hear from you.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground-primary">Email</h3>
                  <p className="text-foreground-secondary">hello@techcalendar.dev</p>
                  <p className="text-sm text-foreground-tertiary">We respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground-primary">Office</h3>
                  <p className="text-foreground-secondary">San Francisco, CA</p>
                  <p className="text-sm text-foreground-tertiary">Remote-first company</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground-primary">Support Hours</h3>
                  <p className="text-foreground-secondary">Monday - Friday, 9AM - 6PM PST</p>
                  <p className="text-sm text-foreground-tertiary">Enterprise support 24/7</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 p-6 bg-background-secondary rounded-xl border border-border-color">
              <h3 className="font-semibold text-foreground-primary mb-4">Quick Resources</h3>
              <div className="space-y-2">
                <a href="/api-docs" className="block text-accent-primary hover:underline">API Documentation →</a>
                <a href="/pricing" className="block text-accent-primary hover:underline">View Pricing Plans →</a>
                <a href="#" className="block text-accent-primary hover:underline">System Status →</a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground-primary mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground-primary mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground-primary mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                >
                  <option value="general">General Inquiry</option>
                  <option value="sales">Enterprise Sales</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership</option>
                  <option value="investment">Investment Opportunity</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground-primary mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary resize-none"
                  placeholder="Tell us more about how we can help..."
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                Send Message
              </button>

              <p className="text-xs text-foreground-tertiary text-center">
                By submitting this form, you agree to our privacy policy and terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}