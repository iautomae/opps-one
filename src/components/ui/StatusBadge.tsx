import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
    label: string;
    className?: string;
}

export function StatusBadge({ label, className }: StatusBadgeProps) {
    return (
        <span className={cn(
            "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide inline-flex justify-center border w-[110px]",
            className || "bg-gray-100 text-gray-500 border-gray-200"
        )}>
            {label}
        </span>
    );
}
