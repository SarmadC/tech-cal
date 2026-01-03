'use client';

import React from 'react';
import { X } from '@phosphor-icons/react';
import { CareerProfile } from '@/types/career';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useQuickEditForm } from './hooks/useQuickEditForm';

// Editor imports
import RoleEditor from './editors/RoleEditor';
import SkillsEditor from './editors/SkillsEditor';
import GoalsEditor from './editors/GoalsEditor';
import LearningPreferencesEditor from './editors/LearningPreferencesEditor';
import NetworkingPreferencesEditor from './editors/NetworkingPreferencesEditor';
import TeamPreferencesEditor from './editors/TeamPreferencesEditor';

// Validation imports
import { 
  validateRoleSection, 
  validateSkillsSection 
} from './hooks/useQuickEditForm';
import { QuickEditSection } from './sections';

// Interface for QuickEditModal props
interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: QuickEditSection;
  currentProfile?: CareerProfile;
  onSectionCompleted?: (section: QuickEditSection) => void;
  onStateChange?: (state: { 
    isDirty: boolean; 
    isSaving: boolean; 
    saveError?: string | null 
  }) => void;
}

// Section title mapping
const SECTION_TITLES: Record<QuickEditSection, string> = {
  role: 'Role Information',
  skills: 'Skills & Interests',
  goals: 'Career Goals',
  learning: 'Learning Preferences',
  networking: 'Networking Goals',
  team: 'Team Preferences'
};

// Validation mapping
const SECTION_VALIDATORS: Record<QuickEditSection, (draft: Partial<CareerProfile>) => boolean> = {
  role: validateRoleSection,
  skills: validateSkillsSection,
  goals: () => true,
  learning: () => true,
  networking: () => true,
  team: () => true
};

// Editor component mapping
const SECTION_EDITORS = {
  role: RoleEditor,
  skills: SkillsEditor,
  goals: GoalsEditor,
  learning: LearningPreferencesEditor,
  networking: NetworkingPreferencesEditor,
  team: TeamPreferencesEditor
};

// Main QuickEditModal component
const QuickEditModal: React.FC<QuickEditModalProps> = React.memo(({
  isOpen, 
  onClose, 
  section, 
  currentProfile: _currentProfile, 
  onSectionCompleted,
  onStateChange
}) => {
  // Use career profile hook for latest profile
  const { careerProfile, saveCareerProfile, refreshProfile, isLoading } = useCareerProfile();
  const { showSuccess, showError } = useSnackbar();

  // Prefer profile from hook, fallback to passed profile
  const currentProfile = careerProfile || _currentProfile;

  // Select the appropriate editor and validator
  const Editor = SECTION_EDITORS[section];
  const validateSection = SECTION_VALIDATORS[section];

  // Get auth context refresh function
  const { refreshProfile: refreshAuthProfile } = useAuth();

  // Use the quick edit form hook - MUST be called before any early returns
  const { 
    draft, 
    updateDraft, 
    saveDraft, 
    isDirty, 
    isSaving, 
    saveError 
  } = useQuickEditForm({
    initialProfile: currentProfile,
    section,
    validate: validateSection,
    onSave: async (updates) => {
      // Merge updates with current profile
      const updatedProfile = { 
        ...currentProfile, 
        ...updates 
      } as CareerProfile;

      // Save updated profile
      await saveCareerProfile(updatedProfile);

      // Call section completed callback if provided
      if (onSectionCompleted) {
        onSectionCompleted(section);
      }

      // Refresh both career profile and auth context profile to get latest data
      await refreshProfile();
      await refreshAuthProfile();
    }
  });

  // Expose state changes to parent component
  React.useEffect(() => {
    onStateChange?.({ 
      isDirty, 
      isSaving,
      saveError 
    });
  }, [isDirty, isSaving, saveError, onStateChange]);

  // Early return conditions - AFTER all hooks
  if (!isOpen) return null;

  // Loading state when profile is not available
  if (isLoading || !currentProfile) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-modal-loading"
      >
        <div 
          className="w-full max-w-3xl rounded-3xl bg-background-secondary p-8 text-center"
          role="document"
        >
          <div className="animate-pulse">
            <div className="h-6 opacity-10 rounded mb-4 w-3/4 mx-auto"></div>
            <div className="h-4 opacity-5 rounded w-1/2 mx-auto"></div>
          </div>
          <p 
            id="quick-edit-modal-loading" 
            className="mt-4 text-foreground-secondary"
          >
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Handle cancel action
  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  // Handle save action
  const handleSave = async () => {
    try {
      const saveResult = await saveDraft();
      if (saveResult) {
        showSuccess('Profile section updated successfully!');
        // Show inline feedback before closing
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving profile section:', error);
      showError('Failed to update profile section. Please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-modal-title"
    >
      <div 
        className="w-full max-w-[500px] max-h-[90vh] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-2xl transition-transform duration-300"
        role="document"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 
              id="quick-edit-modal-title" 
              className="text-lg font-medium text-zinc-100"
            >
              Edit {SECTION_TITLES[section]}
            </h2>
            {isDirty && (
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-zinc-500 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/50 rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-6">
          <Editor 
            profile={draft} 
            onUpdate={updateDraft} 
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
          {/* Error Message */}
          {saveError && (
            <div 
              className="mr-auto text-sm text-red-400 flex items-center gap-2" 
              role="alert"
            >
              <span>{saveError}</span>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="text-sm text-zinc-400 hover:text-white transition-colors focus:outline-none"
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`
              text-sm font-medium px-4 py-1.5 rounded-md transition-all
              ${isDirty && !isSaving
                ? 'bg-white text-black hover:bg-zinc-100'
                : 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500'
              }
            `}
          >
            {isSaving ? (
              <>
                <span className="inline-block mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Saving…
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

QuickEditModal.displayName = 'QuickEditModal';

export default QuickEditModal;