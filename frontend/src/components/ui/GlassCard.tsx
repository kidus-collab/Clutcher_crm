import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hoverEffect = false }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative
        bg-white
        border border-slate-200
        rounded-lg
        transition-all duration-200
        ${hoverEffect ? 'hover:shadow-md hover:border-slate-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;