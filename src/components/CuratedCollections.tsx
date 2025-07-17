// src/components/CuratedCollections.tsx

'use client';

import { useState } from 'react';
import { ChevronDown, Star, TrendingUp, Building2, Cpu, Users, Sparkles } from 'lucide-react';

// Event type for filtering - Updated to match database schema
interface EventForFiltering {
  id: string;
  title?: string | null;
  description?: string | null;
  organizer?: string | null;
  event_type_id?: string | null;
}

// Collection definitions
export const CURATED_COLLECTIONS = {
  all: {
    id: 'all',
    name: 'All Events',
    description: 'View all available events',
    icon: Users,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    filter: () => true
  },
  faang: {
    id: 'faang',
    name: 'FAANG & Big Tech',
    description: 'Apple, Google, Microsoft, Meta, Amazon, Tesla events',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    filter: (event: EventForFiltering) => {
      const organizer = event.organizer?.toLowerCase() || '';
      const bigTechCompanies = [
        'apple', 'google', 'alphabet', 'microsoft', 'meta', 'facebook', 
        'amazon', 'tesla', 'netflix', 'nvidia', 'salesforce', 'oracle',
        'adobe', 'intel', 'ibm', 'cisco', 'uber', 'airbnb', 'spotify'
      ];
      return bigTechCompanies.some(company => organizer.includes(company));
    }
  },
  ai: {
    id: 'ai',
    name: 'AI Breakthroughs',
    description: 'Cutting-edge AI, ML, and emerging tech events',
    icon: Cpu,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    filter: (event: EventForFiltering) => {
      const title = event.title?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const organizer = event.organizer?.toLowerCase() || '';
      
      const aiKeywords = [
        'ai', 'artificial intelligence', 'machine learning', 'ml', 'neural',
        'deep learning', 'llm', 'gpt', 'chatgpt', 'claude', 'openai',
        'computer vision', 'nlp', 'robotics', 'automation', 'blockchain',
        'crypto', 'quantum', 'autonomous', 'generative'
      ];
      
      const aiCompanies = [
        'openai', 'anthropic', 'deepmind', 'hugging face', 'stability ai',
        'midjourney', 'replicate', 'cohere', 'ai21', 'inflection'
      ];
      
      return aiKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      ) || aiCompanies.some(company => organizer.includes(company));
    }
  },
  founders: {
    id: 'founders',
    name: 'For Founders',
    description: 'Startup events, funding, business strategy, and leadership',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    filter: (event: EventForFiltering) => {
      const title = event.title?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const organizer = event.organizer?.toLowerCase() || '';
      
      const founderKeywords = [
        'startup', 'founder', 'entrepreneur', 'funding', 'investment',
        'venture capital', 'vc', 'pitch', 'business model', 'strategy',
        'leadership', 'ceo', 'cto', 'scaling', 'growth', 'launch',
        'product market fit', 'mvp', 'fundraising', 'series a', 'seed',
        'incubator', 'accelerator', 'y combinator', 'techstars'
      ];
      
      const businessOrganizers = [
        'techcrunch', 'tech crunch', 'startup grind', 'first round',
        'a16z', 'andreessen horowitz', 'sequoia', 'kleiner perkins',
        'y combinator', 'techstars', 'founder', 'entrepreneurs'
      ];
      
      return founderKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      ) || businessOrganizers.some(org => organizer.includes(org));
    }
  },
  featured: {
    id: 'featured',
    name: 'Featured Events',
    description: 'High-impact events curated by our team',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    filter: (event: EventForFiltering) => {
      // Featured events criteria: major companies + high-impact keywords
      const organizer = event.organizer?.toLowerCase() || '';
      const title = event.title?.toLowerCase() || '';
      
      const majorCompanies = ['apple', 'google', 'microsoft', 'meta', 'tesla', 'openai'];
      const highImpactKeywords = [
        'keynote', 'wwdc', 'google i/o', 'build', 'f8', 'aws re:invent',
        'dreamforce', 'ces', 'launch', 'announce', 'reveal', 'unveil'
      ];
      
      const isMajorCompany = majorCompanies.some(company => organizer.includes(company));
      const isHighImpact = highImpactKeywords.some(keyword => title.includes(keyword));
      
      return isMajorCompany || isHighImpact;
    }
  }
};

interface CuratedCollectionsProps {
  selectedCollection: string;
  onCollectionChange: (collectionId: string) => void;
  eventCounts?: Record<string, number>;
}

export default function CuratedCollections({
  selectedCollection,
  onCollectionChange,
  eventCounts = {}
}: CuratedCollectionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const collections = Object.values(CURATED_COLLECTIONS);
  const currentCollection = CURATED_COLLECTIONS[selectedCollection as keyof typeof CURATED_COLLECTIONS] || CURATED_COLLECTIONS.all;

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${currentCollection.bgColor} rounded-lg flex items-center justify-center`}>
            <currentCollection.icon className={`w-4 h-4 ${currentCollection.color}`} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {currentCollection.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-48">
              {currentCollection.description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {eventCounts[selectedCollection] && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
              {eventCounts[selectedCollection]}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="py-2">
            {collections.map((collection) => {
              const Icon = collection.icon;
              const isSelected = collection.id === selectedCollection;
              const count = eventCounts[collection.id];
              
              return (
                <button
                  key={collection.id}
                  onClick={() => {
                    onCollectionChange(collection.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${collection.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${collection.color}`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {collection.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {collection.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {count !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {count}
                      </span>
                    )}
                    {collection.id === 'featured' && (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to filter events by collection
export function useFilteredEventsByCollection(events: EventForFiltering[], collectionId: string) {
  const collection = CURATED_COLLECTIONS[collectionId as keyof typeof CURATED_COLLECTIONS];
  
  if (!collection) return events;
  
  return events.filter(collection.filter);
}

// Hook to get event counts for all collections
export function useCollectionEventCounts(events: EventForFiltering[]) {
  const counts: Record<string, number> = {};
  
  Object.values(CURATED_COLLECTIONS).forEach(collection => {
    counts[collection.id] = events.filter(collection.filter).length;
  });
  
  return counts;
}