import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  title?: string;
  description?: string;
  supportText?: string;
  className?: string;
}

type DropZoneState = 'idle' | 'dragover' | 'uploading' | 'success' | 'error';

/**
 * DropZone - Premium drag & drop component for CSV file uploads
 * Features pulsing animation when hovering files and modern glassmorphism styling
 */
export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  title = 'Upload CSV File',
  description = 'Drag and drop your file here, or click to browse',
  supportText = 'Supports CSV files up to 10MB',
  className
}) => {
  const [state, setState] = useState<DropZoneState>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Validate file before processing
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (accept && !file.name.toLowerCase().endsWith('.csv')) {
      return 'Please select a CSV file';
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  }, [accept, maxSize]);

  // Handle file selection (both drag and click)
  const handleFileSelect = useCallback((file: File) => {
    if (disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      setTimeout(() => {
        setState('idle');
        setError(null);
      }, 3000);
      return;
    }

    setState('success');
    setError(null);
    onFileSelect(file);

    // Reset to idle after showing success
    setTimeout(() => {
      setState('idle');
    }, 2000);
  }, [disabled, validateFile, onFileSelect]);

  // Drag event handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setState('dragover');
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setState('idle');
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current = 0;
    setState('idle');

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Click handler for file input
  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  // Get state-specific styles
  const getStateStyles = () => {
    switch (state) {
      case 'dragover':
        return {
          container: 'border-vyndo-primary-400 bg-vyndo-primary-50 scale-[1.02] shadow-glass-lg',
          icon: 'text-vyndo-primary-600 animate-bounce',
          title: 'text-vyndo-primary-700',
          description: 'text-vyndo-primary-600',
          pulse: true
        };
      case 'uploading':
        return {
          container: 'border-vyndo-warning-400 bg-vyndo-warning-50',
          icon: 'text-vyndo-warning-600 animate-spin',
          title: 'text-vyndo-warning-700',
          description: 'text-vyndo-warning-600',
          pulse: false
        };
      case 'success':
        return {
          container: 'border-vyndo-success-400 bg-vyndo-success-50',
          icon: 'text-vyndo-success-600',
          title: 'text-vyndo-success-700',
          description: 'text-vyndo-success-600',
          pulse: false
        };
      case 'error':
        return {
          container: 'border-vyndo-danger-400 bg-vyndo-danger-50',
          icon: 'text-vyndo-danger-600',
          title: 'text-vyndo-danger-700',
          description: 'text-vyndo-danger-600',
          pulse: false
        };
      default:
        return {
          container: 'border-vyndo-neutral-300 bg-white hover:border-vyndo-neutral-400 hover:bg-vyndo-neutral-50',
          icon: 'text-vyndo-neutral-400',
          title: 'text-vyndo-neutral-900',
          description: 'text-vyndo-neutral-600',
          pulse: false
        };
    }
  };

  const stateStyles = getStateStyles();

  // Get appropriate icon
  const getIcon = () => {
    switch (state) {
      case 'success':
        return CheckCircle2;
      case 'error':
        return AlertCircle;
      default:
        return Upload;
    }
  };

  const Icon = getIcon();

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone container */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border border-dashed border-slate-300/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ease-out',
          'focus-within:ring-2 focus-within:ring-vyndo-primary-500 focus-within:ring-offset-2',
          stateStyles.container,
          {
            'cursor-not-allowed opacity-50': disabled,
            'animate-pulse': stateStyles.pulse,
          }
        )}
      >
        {/* Background gradient overlay for premium effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-xl pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="mx-auto mb-4">
            <Icon className={cn('h-12 w-12 transition-all duration-300', stateStyles.icon)} />
          </div>

          {/* Title */}
          <h3 className={cn('text-lg font-semibold mb-2 transition-colors duration-300', stateStyles.title)}>
            {state === 'success' ? 'File uploaded successfully!' : 
             state === 'error' ? 'Upload failed' :
             state === 'dragover' ? 'Drop file here' :
             title}
          </h3>

          {/* Description */}
          <p className={cn('text-sm mb-4 transition-colors duration-300', stateStyles.description)}>
            {state === 'success' ? 'Your file has been processed and is ready for analysis.' :
             state === 'error' ? (error || 'Please try again with a valid file.') :
             state === 'dragover' ? 'Release to upload your CSV file' :
             description}
          </p>

          {/* Support text */}
          {state === 'idle' && (
            <p className="text-xs text-vyndo-neutral-500">
              {supportText}
            </p>
          )}

          {/* File type indicator */}
          {state === 'idle' && (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <FileText className="h-4 w-4 text-vyndo-neutral-400" />
              <span className="text-xs text-vyndo-neutral-500 font-medium">
                CSV FILES ONLY
              </span>
            </div>
          )}
        </div>

        {/* Pulsing border effect for dragover state */}
        {state === 'dragover' && (
          <div className="absolute inset-0 border border-vyndo-primary-400/60 rounded-xl animate-ping opacity-75 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default DropZone;