import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rectangular', 
  ...props 
}) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200/60",
        {
          'rounded-xl': variant === 'rectangular',
          'rounded-full': variant === 'circular',
          'rounded-md h-4 w-full': variant === 'text',
        },
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
