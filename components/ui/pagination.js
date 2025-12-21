import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";
const Pagination = ({ className, ...props }) => (_jsx("nav", { role: "navigation", "aria-label": "pagination", className: cn("mx-auto flex w-full justify-center", className), ...props }));
Pagination.displayName = "Pagination";
const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (_jsx("ul", { ref: ref, className: cn("flex flex-row items-center gap-1", className), ...props })));
PaginationContent.displayName = "PaginationContent";
const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (_jsx("li", { ref: ref, className: cn("", className), ...props })));
PaginationItem.displayName = "PaginationItem";
const PaginationLink = ({ className, isActive, size = "icon", ...props }) => (_jsx("a", { "aria-current": isActive ? "page" : undefined, className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", isActive
        ? "bg-slate-900 text-white hover:bg-slate-900/90"
        : "text-slate-900 hover:bg-slate-100/80 hover:text-slate-900", size === "default" && "h-10 px-4 py-2", size === "sm" && "h-9 rounded-md px-3", size === "lg" && "h-11 rounded-md px-8", size === "icon" && "h-10 w-10", className), ...props }));
PaginationLink.displayName = "PaginationLink";
const PaginationPrevious = ({ className, ...props }) => (_jsxs(PaginationLink, { "aria-label": "Go to previous page", size: "default", className: cn("gap-1 pl-2.5", className), ...props, children: [_jsx(ChevronLeft, { className: "h-4 w-4" }), _jsx("span", { children: "Previous" })] }));
PaginationPrevious.displayName = "PaginationPrevious";
const PaginationNext = ({ className, ...props }) => (_jsxs(PaginationLink, { "aria-label": "Go to next page", size: "default", className: cn("gap-1 pr-2.5", className), ...props, children: [_jsx("span", { children: "Next" }), _jsx(ChevronRight, { className: "h-4 w-4" })] }));
PaginationNext.displayName = "PaginationNext";
const PaginationEllipsis = ({ className, ...props }) => (_jsxs("span", { "aria-hidden": true, className: cn("flex h-9 w-9 items-center justify-center", className), ...props, children: [_jsx(MoreHorizontal, { className: "h-4 w-4" }), _jsx("span", { className: "sr-only", children: "More pages" })] }));
PaginationEllipsis.displayName = "PaginationEllipsis";
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, };
