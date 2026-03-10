import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DataPanelProps {
    children: ReactNode;
    className?: string;
}

export function DataPanel({ children, className }: DataPanelProps) {
    return (
        <div className={cn("flex-1 overflow-auto bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl relative flex flex-col", className)}>
            {children}
        </div>
    );
}
