'use client';

import React from 'react';
import { Warning, TrendUp, X } from '@phosphor-icons/react';
import { calculatePredictions } from '@/utils/predictionUtils';
import type { TrackedEventRecord } from '@/types';

interface AnomalyBannerProps {
  trackedEvents: TrackedEventRecord[];
  onDismiss?: () => void;
}

export function AnomalyBanner({ trackedEvents, onDismiss }: AnomalyBannerProps) {
  const { anomaly } = calculatePredictions(trackedEvents);
  
  if (!anomaly) return null;

  const isWarning = anomaly.type === 'warning';
  const Icon = isWarning ? Warning : TrendUp;
  
  return (
    <div className={`rounded-xl border p-4 ${
      isWarning 
        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30'
        : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isWarning ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          <Icon 
            className={`w-5 h-5 ${
              isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
            }`}
            weight="duotone"
          />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${
            isWarning ? 'text-orange-900 dark:text-orange-300' : 'text-green-900 dark:text-green-300'
          }`}>
            {anomaly.message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

