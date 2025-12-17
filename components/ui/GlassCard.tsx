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
        relative overflow-hidden
        bg-white/60 
        backdrop-blur-xl 
        border border-white/50
        shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
        rounded-2xl 
        transition-all duration-300
        ${hoverEffect ? 'hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:bg-white/70 hover:scale-[1.01] cursor-pointer hover:border-white/80' : ''}
        ${className}
      `}
    >
      {/* Subtle shine effect on top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-50 pointer-events-none" />
      {children}
    </div>
  );
};

export default GlassCard;