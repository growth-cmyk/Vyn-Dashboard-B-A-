import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TimelineStep {
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export interface LoadingTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

/**
 * LoadingTimeline - Simple progress stepper for data upload UX
 * Shows upload progress with visual feedback
 */
export const LoadingTimeline: React.FC<LoadingTimelineProps> = ({
  steps,
  className
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-6 shadow-sm', className)}>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            {/* Step Icon */}
            <div className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
              {
                'bg-gray-100 text-gray-400': step.status === 'pending',
                'bg-blue-100 text-blue-600': step.status === 'active',
                'bg-green-100 text-green-600': step.status === 'complete',
                'bg-red-100 text-red-600': step.status === 'error',
              }
            )}>
              {step.status === 'complete' && <CheckCircle2 className="h-4 w-4" />}
              {step.status === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
              {step.status === 'error' && <XCircle className="h-4 w-4" />}
              {step.status === 'pending' && <div className="h-2 w-2 rounded-full bg-gray-400" />}
            </div>

            {/* Step Label */}
            <span className={cn(
              'text-sm font-medium',
              {
                'text-gray-500': step.status === 'pending',
                'text-blue-700': step.status === 'active',
                'text-green-700': step.status === 'complete',
                'text-red-700': step.status === 'error',
              }
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingTimeline;