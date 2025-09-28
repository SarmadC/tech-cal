'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { MaterialIcon } from '@/components/ui/Icon';

interface TeamCreationDialogProps {
  open: boolean;
  hackathonTitle: string;
  onClose: () => void;
  onCreateTeam: (teamData: { name: string; description: string; lookingForMembers: boolean }) => void;
  isCreating?: boolean;
}

export function TeamCreationDialog({
  open,
  hackathonTitle,
  onClose,
  onCreateTeam,
  isCreating = false
}: TeamCreationDialogProps) {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [lookingForMembers, setLookingForMembers] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; description?: string } = {};
    
    if (!teamName.trim()) {
      newErrors.name = 'Team name is required';
    } else if (teamName.trim().length < 2) {
      newErrors.name = 'Team name must be at least 2 characters';
    } else if (teamName.trim().length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }
    
    if (description.trim().length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    onCreateTeam({
      name: teamName.trim(),
      description: description.trim(),
      lookingForMembers
    });
  };

  const handleClose = () => {
    setTeamName('');
    setDescription('');
    setLookingForMembers(true);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex items-center gap-2">
        <MaterialIcon name="add" className="text-green-600" />
        Create New Team
      </DialogTitle>
      
      <DialogContent className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create a team for <span className="font-medium">{hackathonTitle}</span>
        </div>
        
        <TextField
          fullWidth
          label="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name || 'Choose a unique name for your team'}
          placeholder="e.g., Code Warriors, Innovation Squad"
          disabled={isCreating}
          inputProps={{ maxLength: 50 }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Team Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={!!errors.description}
          helperText={errors.description || 'Describe your team\'s goals, skills, or interests'}
          placeholder="e.g., We\'re looking to build an AI-powered solution for..."
          disabled={isCreating}
          inputProps={{ maxLength: 200 }}
        />
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lookingForMembers"
            checked={lookingForMembers}
            onChange={(e) => setLookingForMembers(e.target.checked)}
            disabled={isCreating}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="lookingForMembers" className="text-sm text-gray-700 dark:text-gray-300">
            Looking for additional team members
          </label>
        </div>
        
        {lookingForMembers && (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <MaterialIcon name="info" size={16} className="inline mr-1" />
            Other participants will be able to see and join your team
          </div>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isCreating || !teamName.trim()}
          className="bg-green-600 hover:bg-green-700"
        >
          {isCreating ? 'Creating...' : 'Create Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
