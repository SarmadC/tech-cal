'use client';

import React, { useState } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import type { HackathonTeam } from '@/types/hackathon';

interface TeamSearchFilterProps {
  teams: HackathonTeam[];
  onFilteredTeams: (teams: HackathonTeam[]) => void;
  maxTeamSize: number;
}

type SortOption = 'newest' | 'oldest' | 'most_members' | 'least_members' | 'alphabetical';
type FilterOption = 'all' | 'looking_for_members' | 'full' | 'available'; 

export function TeamSearchFilter({ teams, onFilteredTeams, maxTeamSize }: TeamSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Filter and sort teams based on current settings
  const filteredTeams = React.useMemo(() => {
    let filtered = [...teams];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(query) ||
        (team.description && team.description.toLowerCase().includes(query))
      );
    }

    // Apply availability filter
    switch (filterBy) {
      case 'looking_for_members':
        filtered = filtered.filter(team => team.lookingForMembers);
        break;
      case 'full':
        filtered = filtered.filter(team => (team.memberCount || 0) >= maxTeamSize);
        break;
      case 'available':
        filtered = filtered.filter(team => 
          team.lookingForMembers && (team.memberCount || 0) < maxTeamSize
        );
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'most_members':
        filtered.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
        break;
      case 'least_members':
        filtered.sort((a, b) => (a.memberCount || 0) - (b.memberCount || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [teams, searchQuery, sortBy, filterBy, maxTeamSize]);

  // Update parent component when filtered teams change
  React.useEffect(() => {
    onFilteredTeams(filteredTeams);
  }, [filteredTeams, onFilteredTeams]);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <MaterialIcon 
          name="search" 
          size={20} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-tertiary"
        />
        <input
          type="text"
          placeholder="Search teams by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-glass-primary placeholder:text-glass-tertiary focus:ring-2 focus:ring-white/20 focus:border-white/20"
        />
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: 'All Teams', icon: 'menu' as const },
            { key: 'available', label: 'Available', icon: 'check-circle' as const },
            { key: 'looking_for_members', label: 'Looking for Members', icon: 'add' as const },
            { key: 'full', label: 'Full Teams', icon: 'people' as const }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilterBy(key as FilterOption)}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterBy === key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-glass-tertiary hover:bg-white/10 hover:text-glass-secondary border border-white/10'
              }`}
            >
              <MaterialIcon name={icon} size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <MaterialIcon name="filter" size={16} className="text-glass-tertiary" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="min-w-0 flex-1 text-xs border border-white/10 rounded-md bg-white/5 text-glass-primary px-2 py-1 focus:ring-2 focus:ring-white/20 focus:border-white/20 sm:w-auto sm:flex-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_members">Most Members</option>
            <option value="least_members">Least Members</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}
