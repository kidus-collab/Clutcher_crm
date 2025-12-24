import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '../../lib/utils';
const Skeleton = ({ className, variant = 'rectangular', ...props }) => {
    return (_jsx("div", { className: cn("animate-pulse bg-slate-200/60", {
            'rounded-xl': variant === 'rectangular',
            'rounded-full': variant === 'circular',
            'rounded-md h-4 w-full': variant === 'text',
        }, className), ...props }));
};
export default Skeleton;
