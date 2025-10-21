'use client';

import React from 'react';
import { X } from '@phosphor-icons/react';
import { CareerProfile } from '@/types/career';
import { useCareerProfile } from '@/hooks/useCareerProfile';
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

      // Refresh profile to get latest data
      await refreshProfile();
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
            <div className="h-6 bg-gray-300 rounded mb-4 w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
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
    onClose();
  };

  // Handle save action
  const handleSave = async () => {
    try {
      const saveResult = await saveDraft();
      if (saveResult) {
        showSuccess('Profile section updated successfully!');
        onClose();
      }
    } catch (error) {
      console.error('Error saving profile section:', error);
      showError('Failed to update profile section. Please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-modal-title"
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-border-color bg-background-secondary shadow-2xl transition-transform duration-300"
        role="document"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-background-secondary/80 px-8 py-6">
          <div>
            <h2 
              id="quick-edit-modal-title" 
              className="text-2xl font-semibold text-foreground-primary mb-1"
            >
              Edit {SECTION_TITLES[section]}
            </h2>
            <p className="text-sm text-foreground-secondary">
              Update your profile information
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-foreground-muted transition-all duration-200 hover:border-border-color hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="max-h-[calc(90vh-6rem)] overflow-y-auto px-8 py-6">
          <Editor 
            profile={draft} 
            onUpdate={updateDraft} 
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-background-secondary/80 px-8 py-5">
          {/* Error Message */}
          {saveError && (
            <div 
              className="mr-auto text-sm text-error flex items-center gap-2" 
              role="alert"
            >
              <span>{saveError}</span>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="inline-flex items-center rounded-xl border border-border-color bg-background-tertiary px-5 py-2.5 text-sm font-medium text-foreground-secondary transition-all duration-200 hover:bg-background-tertiary/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2"
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

QuickEditModal.displayName = 'QuickEditModal';

export default QuickEditModal;