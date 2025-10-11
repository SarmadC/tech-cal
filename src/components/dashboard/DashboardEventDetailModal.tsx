'use client';

import { FC, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Event, EventType } from '@/types';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';

interface DashboardEventDetailModalProps {
  event: Event | null;
  onClose: () => void;
  categories: EventType[];
  isOpen: boolean;
}

const DashboardEventDetailModal: FC<DashboardEventDetailModalProps> = ({
  event,
  onClose,
  categories,
  isOpen
}) => {
  // Handle escape key press
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  // Don't render if not open or no event
  if (!isOpen || !event) return null;

  // Use portal to render modal at document.body level
  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-lg transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] animate-in zoom-in-95 fade-in-0 duration-300 ease-out drop-shadow-2xl">
        <EventDetailPanel
          event={event}
          onClose={onClose}
          categories={categories}
          variant="modal"
        />
      </div>
    </div>,
    document.body
  );
};

export default DashboardEventDetailModal;

