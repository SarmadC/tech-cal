'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useContext, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

// Lazy‑load MUI surfaces only when needed to keep them out of the base bundle
const MuiSnackbar = dynamic(() => import('@mui/material/Snackbar'), { ssr: false });
const MuiAlert = dynamic(() => import('@mui/material/Alert'), { ssr: false });
const MuiDialog = dynamic(() => import('@mui/material/Dialog'), { ssr: false });
const MuiDialogActions = dynamic(() => import('@mui/material/DialogActions'), { ssr: false });
const MuiDialogContent = dynamic(() => import('@mui/material/DialogContent'), { ssr: false });
const MuiDialogContentText = dynamic(() => import('@mui/material/DialogContentText'), { ssr: false });
const MuiDialogTitle = dynamic(() => import('@mui/material/DialogTitle'), { ssr: false });

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

// Themed dialog component
function ThemedDialog({ children, theme }: { children: React.ReactNode, theme: string | undefined }) {
  // Dynamically import and wrap with MUI Theme
  const [ThemeProvider, setThemeProvider] = useState<any>(null);
  const [muiTheme, setMuiTheme] = useState<any>(null);
  
  React.useEffect(() => {
    import('@mui/material/styles').then((mui) => {
      const darkTheme = mui.createTheme({
        palette: {
          mode: 'dark',
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
          },
        },
      });
      
      const lightTheme = mui.createTheme({
        palette: {
          mode: 'light',
          background: {
            default: '#ffffff',
            paper: '#ffffff',
          },
          text: {
            primary: '#0f0f0f',
            secondary: '#666666',
          },
        },
      });

      setThemeProvider(mui.ThemeProvider);
      setMuiTheme(theme === 'dark' ? darkTheme : lightTheme);
    });
  }, [theme]);

  if (!ThemeProvider || !muiTheme) return <>{children}</>;
  
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const themeContext = useNextTheme();
  const theme = themeContext?.theme ?? undefined;
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Ensure we're mounted in the browser before rendering MUI components
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

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

      {/* Snackbar: mount only when a message exists to defer MUI loading */}
      {isMounted && snackbar && (
        <MuiSnackbar
          open
          autoHideDuration={snackbar.autoHideDuration || null}
          onClose={handleSnackbarClose}
          anchorOrigin={getAnchorOrigin(snackbar.severity)}
          key={snackbar.id}
        >
          <MuiAlert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </MuiAlert>
        </MuiSnackbar>
      )}

      {/* Confirmation Dialog: mount only when open to defer MUI loading */}
      {isMounted && confirmation.open && (
        <ThemedDialog theme={theme}>
          <MuiDialog
            open
            onClose={confirmation.onCancel}
            aria-labelledby="confirmation-dialog-title"
          >
            <MuiDialogTitle id="confirmation-dialog-title">
              {confirmation.title}
            </MuiDialogTitle>
            <MuiDialogContent>
              <MuiDialogContentText>
                {confirmation.message}
              </MuiDialogContentText>
            </MuiDialogContent>
            <MuiDialogActions>
              <Button onClick={confirmation.onCancel} variant="outline">
                {confirmation.cancelText}
              </Button>
              <Button onClick={confirmation.onConfirm} variant="destructive" autoFocus>
                {confirmation.confirmText}
              </Button>
            </MuiDialogActions>
          </MuiDialog>
        </ThemedDialog>
      )}
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
