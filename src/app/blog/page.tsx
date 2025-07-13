// src/app/blog/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of AI: Insights from Google I/O 2024',
    excerpt: 'Google unveiled groundbreaking AI advancements at I/O 2024, including updates to Gemini and new developer tools that promise to revolutionize how we build applications.',
    author: 'Sarah Chen',
    date: 'Jan 15, 2024',
    readTime: '5 min read',
    category: 'AI & ML',
    image: '/blog/ai-future.jpg',
    featured: true
  },
  {
    id: 2,
    title: 'React 19: Everything You Need to Know',
    excerpt: 'React 19 brings significant performance improvements and new features. Here\'s a comprehensive guide to what\'s new and how to migrate your applications.',
    author: 'Marcus Rodriguez',
    date: 'Jan 12, 2024',
    readTime: '8 min read',
    category: 'Web Dev',
    image: '/blog/react-19.jpg',
    featured: false
  },
  {
    id: 3,
    title: 'Apple Vision Pro: A Developer\'s Perspective',
    excerpt: 'After spending a month developing for Vision Pro, here are my insights on the platform\'s potential and challenges for developers.',
    author: 'Alex Kim',
    date: 'Jan 10, 2024',
    readTime: '10 min read',
    category: 'AR/VR',
    image: '/blog/vision-pro.jpg',
    featured: false
  },
  {
    id: 4,
    title: 'Cloud Computing Trends to Watch in 2024',
    excerpt: 'From edge computing to sustainable cloud practices, explore the trends shaping the future of cloud infrastructure this year.',
    author: 'Priya Patel',
    date: 'Jan 8, 2024',
    readTime: '6 min read',
    category: 'Cloud',
    image: '/blog/cloud-trends.jpg',
    featured: false
  },
  {
    id: 5,
    title: 'Building Secure APIs: Best Practices for 2024',
    excerpt: 'Security should be at the forefront of API development. Learn the latest best practices and tools to protect your APIs from common vulnerabilities.',
    author: 'David Thompson',
    date: 'Jan 5, 2024',
    readTime: '7 min read',
    category: 'Security',
    image: '/blog/api-security.jpg',
    featured: false
  },
  {
    id: 6,
    title: 'The Rise of Rust in Systems Programming',
    excerpt: 'Why more companies are choosing Rust for systems programming and how it\'s changing the landscape of low-level development.',
    author: 'Emily Zhang',
    date: 'Jan 3, 2024',
    readTime: '9 min read',
    category: 'Programming',
    image: '/blog/rust-systems.jpg',
    featured: false
  }
];

const categories = ['All', 'AI & ML', 'Web Dev', 'Mobile', 'Cloud', 'Security', 'AR/VR', 'Programming'];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogPosts.find(post => post.featured);

  return (
    <div className="min-h-screen bg-background-main pt-20">
      {/* Header */}
      <section className="py-16 px-4 bg-background-secondary border-b border-border-color">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
            TechCalendar Blog
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl">
            Stay informed with insights, tutorials, and news from the tech world. 
            Learn from industry experts and discover what's shaping the future of technology.
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-accent-primary text-white'
                      : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Post */}
          {featuredPost && selectedCategory === 'All' && !searchTerm && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-accent-primary to-purple-600 rounded-2xl p-8 text-white">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Featured</span>
                  <span className="text-sm opacity-80">{featuredPost.category}</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-lg opacity-90 mb-6 line-clamp-2">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <span>{featuredPost.author}</span>
                    <span className="opacity-60">•</span>
                    <span>{featuredPost.date}</span>
                    <span className="opacity-60">•</span>
                    <span>{featuredPost.readTime}</span>
                  </div>
                  <Link
                    href={`/blog/${featuredPost.id}`}
                    className="bg-white text-accent-primary hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition-all"
                  >
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="bg-background-secondary rounded-xl border border-border-color overflow-hidden hover:border-accent-primary/30 transition-all group"
              >
                {/* Placeholder for image */}
                <div className="aspect-video bg-gradient-to-br from-accent-primary/20 to-purple-600/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-background-tertiary animate-pulse" />
                </div>

                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-xs font-medium text-accent-primary">{post.category}</span>
                    <span className="text-xs text-foreground-tertiary">•</span>
                    <span className="text-xs text-foreground-tertiary">{post.readTime}</span>
                  </div>

                  <h3 className="text-xl font-semibold text-foreground-primary mb-3 group-hover:text-accent-primary transition-colors">
                    <Link href={`/blog/${post.id}`}>
                      {post.title}
                    </Link>
                  </h3>

                  <p className="text-foreground-secondary mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-accent-primary">
                          {post.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-foreground-primary">{post.author}</p>
                        <p className="text-xs text-foreground-tertiary">{post.date}</p>
                      </div>
                    </div>
                    
                    <Link
                      href={`/blog/${post.id}`}
                      className="text-accent-primary hover:text-accent-primary-hover transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-r from-accent-primary to-purple-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">
              Stay Updated with Tech News
            </h2>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Get weekly insights on the latest tech events, tutorials, and industry news delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-foreground-primary bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="bg-white text-accent-primary hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}