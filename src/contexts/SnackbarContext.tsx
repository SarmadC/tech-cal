'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarMessage {
  id: string;
  message: string;
  severity: SnackbarSeverity;
  autoHideDuration?: number;
}

interface ConfirmationDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface SnackbarContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
    }
  ) => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const showMessage = useCallback((
    message: string,
    severity: SnackbarSeverity,
    duration?: number
  ) => {
    setSnackbar({
      id: Date.now().toString(),
      message,
      severity,
      autoHideDuration: duration
    });
  }, []);

  const showSuccess = useCallback((message: string, duration = 4000) => {
    showMessage(message, 'success', duration);
  }, [showMessage]);

  const showError = useCallback((message: string, duration = 6000) => {
    showMessage(message, 'error', duration);
  }, [showMessage]);

  const showWarning = useCallback((message: string, duration = 8000) => {
    showMessage(message, 'warning', duration);
  }, [showMessage]);

  const showInfo = useCallback((message: string, duration = 5000) => {
    showMessage(message, 'info', duration);
  }, [showMessage]);

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    setConfirmation({
      open: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmation(prev => ({ ...prev, open: false }));
      },
      onCancel: () => {
        setConfirmation(prev => ({ ...prev, open: false }));
      },
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel'
    });
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(null);
  }, []);

  const getAnchorOrigin = (severity: SnackbarSeverity) => {
    switch (severity) {
      case 'success':
        return { vertical: 'bottom' as const, horizontal: 'right' as const };
      case 'error':
      case 'warning':
        return { vertical: 'top' as const, horizontal: 'center' as const };
      default:
        return { vertical: 'bottom' as const, horizontal: 'left' as const };
    }
  };

  return (
    <SnackbarContext.Provider value={{
      showSuccess,
      showError,
      showWarning,
      showInfo,
      showConfirmation
    }}>
      {children}

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={snackbar?.autoHideDuration || null}
        onClose={handleSnackbarClose}
        anchorOrigin={snackbar ? getAnchorOrigin(snackbar.severity) : undefined}
        key={snackbar?.id}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar?.message || ''}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmation.open}
        onClose={confirmation.onCancel}
        aria-labelledby="confirmation-dialog-title"
      >
        <DialogTitle id="confirmation-dialog-title">
          {confirmation.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmation.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmation.onCancel}>
            {confirmation.cancelText}
          </Button>
          <Button
            onClick={confirmation.onConfirm}
            variant="contained"
            autoFocus
          >
            {confirmation.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextType {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}