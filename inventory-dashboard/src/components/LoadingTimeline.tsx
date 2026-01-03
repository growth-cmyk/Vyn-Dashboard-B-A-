import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Database, 
  BarChart3, 
  Clock,
  AlertCircle 
} from 'lucide-react';
import { cn } from '../utils/cn';

export interface LoadingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedDuration: number; // in milliseconds
}

export interface LoadingTimelineProps {
  isActive: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const UPLOAD_STEPS: LoadingStep[] = [
  {
    id: 'parsing',
    label: 'Parsing Data',
    description: 'Reading and validating CSV file structure',
    icon: FileText,
    estimatedDuration: 1000
  },
  {
    id: 'validating',
    label: 'Validating Logic',
    description: 'Checking data integrity and business rules',
    icon: CheckCircle2,
    estimatedDuration: 1500
  },
  {
    id: 'snapshotting',
    label: 'Snapshotting History',
    description: 'Saving inventory snapshot for trend analysis',
    icon: Database,
    estimatedDuration: 800
  },
  {
    id: 'ready',
    label: 'Dashboard Ready',
    description: 'Updating visualizations and analytics',
    icon: BarChart3,
    estimatedDuration: 500
  }
];

type StepStatus = 'pending' | 'active' | 'completed' | 'error';

interface StepState {
  status: StepStatus;
  progress: number; // 0-100
  startTime?: number;
}

/**
 * LoadingTimeline - Advanced progress stepper for data upload UX
 * Shows 4 stages: Parsing Data -> Validating Logic -> Snapshotting History -> Dashboard Ready
 * Uses Vyndo Orange palette for progress bar and Lucide icons for each step
 */
export const LoadingTimeline: React.FC<LoadingTimelineProps> = ({
  isActive,
  onComplete,
  className
}) => {
  const [stepStates, setStepStates] = useState<Record<string, StepState>>(() => {
    const initialStates: Record<string, StepState> = {};
    UPLOAD_STEPS.forEach(step => {
      initialStates[step.id] = { status: 'pending', progress: 0 };
    });
    return initialStates;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  // Calculate total estimated duration
  const totalEstimatedDuration = UPLOAD_STEPS.reduce((sum, step) => sum + step.estimatedDuration, 0);

  // Reset timeline when becoming active
  useEffect(() => {
    if (isActive) {
      const initialStates: Record<string, StepState> = {};
      UPLOAD_STEPS.forEach(step => {
        initialStates[step.id] = { status: 'pending', progress: 0 };
      });
      setStepStates(initialStates);
      setCurrentStepIndex(0);
      setEstimatedTimeRemaining(totalEstimatedDuration);
    }
  }, [isActive, totalEstimatedDuration]);

  // Progress through steps when active
  useEffect(() => {
    if (!isActive || currentStepIndex >= UPLOAD_STEPS.length) {
      return;
    }

    const currentStep = UPLOAD_STEPS[currentStepIndex];
    const startTime = Date.now();

    // Mark current step as active
    setStepStates(prev => ({
      ...prev,
      [currentStep.id]: { 
        status: 'active', 
        progress: 0, 
        startTime 
      }
    }));

    // Simulate progress for current step
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / currentStep.estimatedDuration) * 100, 100);
      
      setStepStates(prev => ({
        ...prev,
        [currentStep.id]: { 
          ...prev[currentStep.id],
          progress 
        }
      }));

      // Update estimated remaining
      setEstimatedTimeRemaining(prev => Math.max(0, prev - 50));

      // Complete step when progress reaches 100%
      if (progress >= 100) {
        clearInterval(progressInterval);
        
        setStepStates(prev => ({
          ...prev,
          [currentStep.id]: { 
            ...prev[currentStep.id],
            status: 'completed',
            progress: 100
          }
        }));

        // Move to next step or complete
        if (currentStepIndex < UPLOAD_STEPS.length - 1) {
          setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
          }, 200); // Small delay between steps
        } else {
          // All steps completed
          setTimeout(() => {
            onComplete?.();
          }, 500);
        }
      }
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(progressInterval);
  }, [isActive, currentStepIndex, onComplete]);

  // Calculate overall progress
  const overallProgress = UPLOAD_STEPS.reduce((sum, step) => {
    const stepState = stepStates[step.id];
    if (stepState.status === 'completed') {
      return sum + (step.estimatedDuration / totalEstimatedDuration) * 100;
    } else if (stepState.status === 'active') {
      return sum + (step.estimatedDuration / totalEstimatedDuration) * (stepState.progress / 100) * 100;
    }
    return sum;
  }, 0);

  if (!isActive) {
    return null;
  }

  return (
    <div className={cn('bg-white rounded-xl border border-vyndo-neutral-200 p-6 shadow-elevated', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-vyndo-neutral-900">
            Processing Upload
          </h3>
          <div className="flex items-center text-sm text-vyndo-neutral-600">
            <Clock className="h-4 w-4 mr-1" />
            {estimatedTimeRemaining > 0 
              ? `${Math.ceil(estimatedTimeRemaining / 1000)}s remaining`
              : 'Completing...'
            }
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-vyndo-neutral-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-vyndo-primary-500 to-vyndo-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="text-xs text-vyndo-neutral-500 mt-1">
          {Math.round(overallProgress)}% complete
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-4">
        {UPLOAD_STEPS.map((step, index) => {
          const stepState = stepStates[step.id];
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-start space-x-4">
              {/* Step Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-slate-200/50 transition-all duration-300',
                {
                  // Pending state
                  'border-vyndo-neutral-300 bg-vyndo-neutral-100 text-vyndo-neutral-400': stepState.status === 'pending',
                  
                  // Active state
                  'border-vyndo-primary-500 bg-vyndo-primary-50 text-vyndo-primary-600 animate-pulse': stepState.status === 'active',
                  
                  // Completed state
                  'border-vyndo-success-500 bg-vyndo-success-500 text-white': stepState.status === 'completed',
                  
                  // Error state
                  'border-vyndo-danger-500 bg-vyndo-danger-500 text-white': stepState.status === 'error',
                }
              )}>
                {stepState.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : stepState.status === 'error' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={cn(
                    'text-sm font-medium',
                    {
                      'text-vyndo-neutral-500': stepState.status === 'pending',
                      'text-vyndo-primary-700': stepState.status === 'active',
                      'text-vyndo-success-700': stepState.status === 'completed',
                      'text-vyndo-danger-700': stepState.status === 'error',
                    }
                  )}>
                    {step.label}
                  </h4>
                  
                  {stepState.status === 'active' && (
                    <span className="text-xs text-vyndo-primary-600 font-medium">
                      {Math.round(stepState.progress)}%
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-vyndo-neutral-600 mb-2">
                  {step.description}
                </p>

                {/* Step Progress Bar (only for active step) */}
                {stepState.status === 'active' && (
                  <div className="w-full bg-vyndo-neutral-200 rounded-full h-1">
                    <div 
                      className="bg-vyndo-primary-500 h-1 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${stepState.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Connector Line (except for last step) */}
              {index < UPLOAD_STEPS.length - 1 && (
                <div className={cn(
                  'absolute left-9 mt-10 w-0.5 h-6 transition-colors duration-300',
                  {
                    'bg-vyndo-neutral-300': stepState.status === 'pending',
                    'bg-vyndo-primary-300': stepState.status === 'active',
                    'bg-vyndo-success-300': stepState.status === 'completed',
                  }
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoadingTimeline;