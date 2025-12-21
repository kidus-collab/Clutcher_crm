import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const GlassCard = ({ children, className = '', onClick, hoverEffect = false }) => {
    return (_jsx("div", { onClick: onClick, className: `
        relative
        bg-white
        border border-slate-200
        rounded-lg
        transition-all duration-200
        ${hoverEffect ? 'hover:shadow-md hover:border-slate-300' : ''}
        ${className}
      `, children: children }));
};
export default GlassCard;
