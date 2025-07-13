// src/components/FilterSidebar.tsx

import { Plus, Filter } from 'lucide-react';

// The interface for props remains the same
type Category = { id: string; name: string; color: string; };

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
}

export default function FilterSidebar({ categories, selectedCategories, onToggleCategory }: FilterSidebarProps) {
  return (
    // The p-6 padding and overall structure remain
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Event Categories</h2>
      
      {/* Category List */}
      <div className="space-y-3 mb-6 flex-grow overflow-y-auto">
        {categories.map(category => (
          <label 
            key={category.id} 
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            ></div>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
            <input
              type="checkbox"
              checked={selectedCategories.has(category.id)}
              onChange={() => onToggleCategory(category.id)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-transparent"
            />
          </label>
        ))}
      </div>

      {/* Action Buttons at the bottom */}
      <div className="flex gap-2 mt-auto">
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Event
        </button>
        <button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>
    </div>
  );
}