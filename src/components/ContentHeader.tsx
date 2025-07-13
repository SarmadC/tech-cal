// src/components/ContentHeader.tsx

import { Menu } from 'lucide-react';
import SearchBar from './SearchBar';
import { RefObject } from 'react';

// Define the types for props
type Suggestion = { id: string; title: string; organizer: string; start_time: string; };
interface ContentHeaderProps {
  onToggleSidebar: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSearchFocused: boolean;
  onSearchFocus: () => void;
  searchContainerRef: RefObject<HTMLDivElement>;
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion) => void;
  totalEvents: number;
  upcomingEvents: number;
}

export default function ContentHeader({
  onToggleSidebar,
  searchTerm,
  onSearchChange,
  isSearchFocused,
  onSearchFocus,
  searchContainerRef,
  suggestions,
  onSuggestionClick,
  totalEvents,
  upcomingEvents,
}: ContentHeaderProps) {
  return (
    <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
      <button onClick={onToggleSidebar} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
      
      <div className="flex-1 max-w-md" ref={searchContainerRef}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          isFocused={isSearchFocused}
          onFocus={onSearchFocus}
          suggestions={suggestions}
          onSuggestionClick={onSuggestionClick}
        />
      </div>

      <div className="hidden lg:flex items-center gap-6 ml-8">
        <div className="text-sm">
          <div className="text-gray-500">Total Events</div>
          <div className="text-xl font-semibold text-gray-900">{totalEvents}</div>
        </div>
        <div className="text-sm">
          <div className="text-gray-500">Upcoming</div>
          <div className="text-xl font-semibold text-gray-900">{upcomingEvents}</div>
        </div>
      </div>
    </div>
  );
}