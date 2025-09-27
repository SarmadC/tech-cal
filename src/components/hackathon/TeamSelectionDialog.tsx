'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { MaterialIcon } from '@/components/ui/Icon';
import type { HackathonTeam } from '@/types/hackathon';

interface TeamSelectionDialogProps {
  open: boolean;
  teams: HackathonTeam[];
  onClose: () => void;
  onSelectTeam: (team: HackathonTeam) => void;
}

export function TeamSelectionDialog({
  open,
  teams,
  onClose,
  onSelectTeam
}: TeamSelectionDialogProps) {
  if (!teams.length) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Choose a Team to Join</DialogTitle>
      <DialogContent>
        <div className="space-y-3 mt-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onSelectTeam(team)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {team.name}
                  </h4>
                  {team.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {team.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <MaterialIcon name="people" size={12} />
                      <span>{team.memberCount || 0} members</span>
                    </div>
                    {team.lookingForMembers && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Looking for members
                      </span>
                    )}
                  </div>
                </div>
                <MaterialIcon name="arrow-forward" size={16} className="text-gray-400 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}