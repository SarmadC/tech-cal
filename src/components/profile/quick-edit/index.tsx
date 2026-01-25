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

// Main QuickEditModal component - Now a right-side panel (Linear style)
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

    // Handle keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleCancel();
            }
            // Cmd+Enter or Ctrl+Enter to save
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isOpen) {
                if (isDirty && !isSaving) {
                    e.preventDefault();
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isDirty, isSaving]);

    // Early return conditions - AFTER all hooks
    if (!isOpen) return null;

    // Loading state when profile is not available
    if (isLoading || !currentProfile) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/40 transition-opacity duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="quick-edit-panel-loading"
            >
                <div
                    className="w-full sm:max-w-[480px] h-[92dvh] sm:h-full flex flex-col bg-white dark:bg-[#202124] shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-200 rounded-t-2xl sm:rounded-none"
                    role="document"
                >
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-pulse">
                                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded mb-3 w-48 mx-auto"></div>
                                <div className="h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded w-32 mx-auto"></div>
                            </div>
                            <p
                                id="quick-edit-panel-loading"
                                className="mt-4 text-sm text-zinc-500"
                            >
                                Loading profile...
                            </p>
                        </div>
                    </div>
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
                }, 800);
            }
        } catch (error) {
            console.error('Error saving profile section:', error);
            showError('Failed to update profile section. Please try again.');
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-200"
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                    handleCancel();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-edit-panel-title"
        >
            {/* Right-side Panel */}
            <div
                className="w-full sm:max-w-[480px] h-[92dvh] sm:h-full flex flex-col bg-white dark:bg-[#202124] shadow-[-10px_0_40px_-10px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom sm:slide-in-from-right duration-150 border-t sm:border-t-0 border-l-0 sm:border-l border-zinc-200 dark:border-white/10 rounded-t-2xl sm:rounded-none"
                role="document"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Panel Header - Clean, no divider */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 shrink-0 sticky top-0 bg-white/80 dark:bg-[#202124]/95 backdrop-blur-md z-10 border-b border-zinc-100/80 dark:border-white/5 transition-colors">
                    <h2
                        id="quick-edit-panel-title"
                        className="text-[17px] sm:text-[16px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight"
                    >
                        {SECTION_TITLES[section]}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-block text-[11px] text-zinc-400 dark:text-zinc-500 font-medium px-2 py-1 rounded bg-zinc-100 dark:bg-white/5">
                            Esc to close
                        </span>
                        <button
                            onClick={handleCancel}
                            className="group flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-2 -mr-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Panel Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-2 custom-scrollbar">
                    <Editor
                        profile={draft}
                        onUpdate={updateDraft}
                    />
                </div>

                {/* Panel Footer - Sticky Action Bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-zinc-100 dark:border-white/5 shrink-0 bg-white/80 dark:bg-[#202124]/95 backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
                    {/* Status Area - Clean */}
                    <div className="text-[12px] font-medium min-h-[20px]">
                        {saveError && (
                            <span className="text-red-500">{saveError}</span>
                        )}
                        {/* 'Unsaved changes' text removed for cleaner Linear aesthetic */}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancel}
                            className="text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={`
                                text-[14px] sm:text-[13px] font-medium px-4 py-2.5 sm:py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm
                                ${isDirty && !isSaving
                                    ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border border-transparent'
                                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-white/5 dark:text-zinc-600 border border-transparent'
                                }
                            `}
                        >
                            {isSaving && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

QuickEditModal.displayName = 'QuickEditModal';

export default QuickEditModal;
