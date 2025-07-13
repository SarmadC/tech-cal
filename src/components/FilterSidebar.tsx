'use client';

type Category = {
  id: string;
  name: string;
  color: string;
};

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onFilterChange: (categoryId: string, isChecked: boolean) => void;
}

export default function FilterSidebar({
  categories,
  selectedCategories,
  onFilterChange,
}: FilterSidebarProps) {
  const handleSelectAll = () => categories.forEach(cat => onFilterChange(cat.id, true));
  const handleSelectNone = () => categories.forEach(cat => onFilterChange(cat.id, false));

  return (
    <aside className="w-full h-full flex flex-col">
      
      {/* Logo Section */}
      <div className="px-6 py-6 border-b border-border-color">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent-primary rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground-primary">TechCalendar</h1>
            <p className="text-xs text-foreground-tertiary">Stay updated with tech events</p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="flex-grow overflow-y-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground-secondary">Event Categories</h2>
            <span className="text-xs font-medium text-foreground-tertiary bg-background-tertiary px-2 py-1 rounded-full">
              {selectedCategories.size} of {categories.length}
            </span>
          </div>

          <div className="space-y-1">
            {categories.map((category) => {
              const isSelected = selectedCategories.has(category.id);
              return (
                <label 
                  key={category.id}
                  className={`
                    flex items-center p-3 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'bg-accent-primary-light border border-accent-primary' 
                      : 'hover:bg-background-tertiary border border-transparent'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onFilterChange(category.id, e.target.checked)}
                    className="sr-only"
                  />
                  
                  <div className="flex items-center flex-1">
                    <div 
                      className={`
                        w-3 h-3 rounded-full mr-3 transition-transform
                        ${isSelected ? 'scale-110' : 'scale-100'}
                      `}
                      style={{ backgroundColor: category.color }} 
                    />
                    <span className={`
                      text-sm font-medium transition-colors
                      ${isSelected ? 'text-foreground-primary' : 'text-foreground-secondary'}
                    `}>
                      {category.name}
                    </span>
                  </div>
                  
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${isSelected 
                      ? 'bg-accent-primary border-accent-primary' 
                      : 'border-gray-300'
                    }
                  `}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border-color">
        <div className="flex space-x-2">
          <button 
            onClick={handleSelectAll}
            className="flex-1 py-2 px-3 text-sm font-medium text-foreground-secondary bg-background-tertiary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Select All
          </button>
          <button 
            onClick={handleSelectNone}
            className="flex-1 py-2 px-3 text-sm font-medium text-foreground-secondary bg-background-tertiary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </aside>
  );
}