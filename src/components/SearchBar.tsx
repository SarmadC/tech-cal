// src/components/SearchBar.tsx

import { Search } from 'lucide-react';

type Suggestion = {
  id: string;
  title: string;
  organizer: string;
  start_time: string;
};

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export default function SearchBar({
  searchTerm, onSearchChange, isFocused, onFocus, suggestions, onSuggestionClick
}: SearchBarProps) {
  
  const showSuggestions = isFocused && searchTerm.length > 0 && suggestions.length > 0;

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Search Events..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={onFocus}

        className="
          w-full 
          pl-12 pr-4 py-2.5 /* Padding */

          /* Light Mode Styles (Default) */
          bg-white 
          border border-gray-300 
          text-gray-900 
          placeholder:text-gray-500

          /* Dark Mode Styles (Overrides) */
          dark:bg-gray-800 
          dark:border-gray-700 
          dark:text-white 
          dark:placeholder:text-gray-400

          /* Shared Styles */
          text-base
          rounded-full 
          focus:outline-none 
          focus:ring-2 
          focus:ring-blue-500 
          focus:border-transparent
          transition-all duration-200
        "
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <ul className="py-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  onClick={() => onSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{suggestion.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {suggestion.organizer} • {new Date(suggestion.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}