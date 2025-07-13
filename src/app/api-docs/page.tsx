// src/app/api-docs/page.tsx

'use client';

import { useState } from 'react';

const endpoints = [
  {
    method: 'GET',
    path: '/api/events',
    description: 'Retrieve all events or filter by parameters',
    parameters: [
      { name: 'category', type: 'string', description: 'Filter by category ID' },
      { name: 'start_date', type: 'date', description: 'Events after this date' },
      { name: 'end_date', type: 'date', description: 'Events before this date' },
      { name: 'limit', type: 'integer', description: 'Maximum number of results' }
    ],
    example: `{
  "events": [
    {
      "id": "evt_123",
      "title": "Apple WWDC 2024",
      "description": "Apple's annual developer conference",
      "start_time": "2024-06-10T10:00:00Z",
      "end_time": "2024-06-14T18:00:00Z",
      "category": "conference",
      "organizer": "Apple Inc.",
      "location": "Cupertino, CA"
    }
  ],
  "total": 150,
  "page": 1
}`
  },
  {
    method: 'GET',
    path: '/api/events/:id',
    description: 'Get details for a specific event',
    parameters: [],
    example: `{
  "id": "evt_123",
  "title": "Apple WWDC 2024",
  "description": "Apple's annual developer conference",
  "start_time": "2024-06-10T10:00:00Z",
  "end_time": "2024-06-14T18:00:00Z",
  "category": "conference",
  "organizer": "Apple Inc.",
  "location": "Cupertino, CA",
  "source_url": "https://developer.apple.com/wwdc24/",
  "livestream_url": "https://www.apple.com/apple-events/",
  "status": "confirmed"
}`
  },
  {
    method: 'GET',
    path: '/api/categories',
    description: 'List all available event categories',
    parameters: [],
    example: `{
  "categories": [
    {
      "id": "cat_conf",
      "name": "Conferences",
      "color": "#3B82F6"
    },
    {
      "id": "cat_release",
      "name": "Product Releases",
      "color": "#10B981"
    }
  ]
}`
  },
  {
    method: 'POST',
    path: '/api/webhooks',
    description: 'Subscribe to event updates',
    parameters: [
      { name: 'url', type: 'string', description: 'Webhook endpoint URL' },
      { name: 'events', type: 'array', description: 'Event types to subscribe to' }
    ],
    example: `{
  "webhook_id": "wh_789",
  "url": "https://your-app.com/webhooks",
  "events": ["event.created", "event.updated"],
  "created_at": "2024-01-15T12:00:00Z"
}`
  }
];

const codeExamples = {
  javascript: `// Fetch upcoming events
const response = await fetch('https://api.techcalendar.dev/v1/events?start_date=2024-01-01');
const data = await response.json();

// Display events
data.events.forEach(event => {
  console.log(\`\${event.title} - \${event.start_time}\`);
});`,
  python: `import requests
from datetime import datetime

# Fetch upcoming events
response = requests.get(
    'https://api.techcalendar.dev/v1/events',
    params={'start_date': '2024-01-01'}
)
events = response.json()

# Display events
for event in events['events']:
    print(f"{event['title']} - {event['start_time']}")`,
  curl: `# Fetch upcoming events
curl -X GET "https://api.techcalendar.dev/v1/events?start_date=2024-01-01" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
};

export default function ApiDocsPage() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);

  return (
    <div className="min-h-screen bg-background-main pt-20">
      {/* Header */}
      <section className="py-16 px-4 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
            API Documentation
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl">
            Integrate TechCalendar into your applications with our powerful REST API. 
            Access real-time tech event data programmatically.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground-tertiary uppercase tracking-wider mb-4">
                  Getting Started
                </h3>
                <div className="space-y-2">
                  <a href="#authentication" className="block text-foreground-secondary hover:text-accent-primary transition-colors">
                    Authentication
                  </a>
                  <a href="#rate-limits" className="block text-foreground-secondary hover:text-accent-primary transition-colors">
                    Rate Limits
                  </a>
                  <a href="#errors" className="block text-foreground-secondary hover:text-accent-primary transition-colors">
                    Error Handling
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground-tertiary uppercase tracking-wider mb-4">
                  Endpoints
                </h3>
                <div className="space-y-2">
                  {endpoints.map((endpoint, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedEndpoint(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedEndpoint === index
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-foreground-secondary hover:bg-background-secondary'
                      }`}
                    >
                      <span className={`inline-block w-12 text-xs font-mono ${
                        endpoint.method === 'GET' ? 'text-success' : 'text-warning'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="text-sm">{endpoint.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-2">
            {/* Authentication Section */}
            <section id="authentication" className="mb-12">
              <h2 className="text-2xl font-bold text-foreground-primary mb-4">Authentication</h2>
              <p className="text-foreground-secondary mb-4">
                All API requests require authentication using an API key. Include your API key in the 
                Authorization header of each request:
              </p>
              <div className="bg-background-secondary rounded-lg p-4 font-mono text-sm">
                Authorization: Bearer YOUR_API_KEY
              </div>
              <p className="text-foreground-secondary mt-4">
                You can generate API keys from your <a href="/dashboard" className="text-accent-primary hover:underline">dashboard</a>.
              </p>
            </section>

            {/* Selected Endpoint Details */}
            <section className="mb-12">
              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <div className="flex items-center mb-4">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                    endpoints[selectedEndpoint].method === 'GET' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {endpoints[selectedEndpoint].method}
                  </span>
                  <code className="ml-3 text-lg font-mono text-foreground-primary">
                    {endpoints[selectedEndpoint].path}
                  </code>
                </div>
                
                <p className="text-foreground-secondary mb-6">
                  {endpoints[selectedEndpoint].description}
                </p>

                {endpoints[selectedEndpoint].parameters.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-foreground-primary mb-3">Parameters</h4>
                    <div className="space-y-2">
                      {endpoints[selectedEndpoint].parameters.map((param, index) => (
                        <div key={index} className="flex items-start">
                          <code className="text-sm font-mono text-accent-primary mr-2">{param.name}</code>
                          <span className="text-xs text-foreground-tertiary mr-2">({param.type})</span>
                          <span className="text-sm text-foreground-secondary">{param.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-foreground-primary mb-3">Example Response</h4>
                  <pre className="bg-background-main rounded-lg p-4 overflow-x-auto">
                    <code className="text-sm text-foreground-secondary">{endpoints[selectedEndpoint].example}</code>
                  </pre>
                </div>
              </div>
            </section>

            {/* Code Examples */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground-primary mb-6">Code Examples</h2>
              
              <div className="mb-4">
                <div className="flex space-x-2">
                  {Object.keys(codeExamples).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-accent-primary text-white'
                          : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                      }`}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                <pre className="overflow-x-auto">
                  <code className="text-sm text-foreground-secondary">
                    {codeExamples[selectedLanguage as keyof typeof codeExamples]}
                  </code>
                </pre>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits" className="mb-12">
              <h2 className="text-2xl font-bold text-foreground-primary mb-4">Rate Limits</h2>
              <p className="text-foreground-secondary mb-4">
                API rate limits vary by plan:
              </p>
              <div className="bg-background-secondary rounded-lg p-6 border border-border-color">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="text-left py-2 text-foreground-primary">Plan</th>
                      <th className="text-left py-2 text-foreground-primary">Requests/Hour</th>
                      <th className="text-left py-2 text-foreground-primary">Requests/Day</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground-secondary">
                    <tr className="border-b border-border-color">
                      <td className="py-3">Free</td>
                      <td className="py-3">100</td>
                      <td className="py-3">1,000</td>
                    </tr>
                    <tr className="border-b border-border-color">
                      <td className="py-3">Pro</td>
                      <td className="py-3">1,000</td>
                      <td className="py-3">10,000</td>
                    </tr>
                    <tr>
                      <td className="py-3">Team</td>
                      <td className="py-3">10,000</td>
                      <td className="py-3">100,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}