import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    isTable?: boolean;
    colSpan?: number;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, isTable = false, colSpan = 1, className }: EmptyStateProps) {
    const content = (
        <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
            <Icon className="w-8 h-8 text-slate-300" />
            <p className="text-slate-500 font-medium">{title}</p>
            {description && <p className="text-xs text-slate-400 max-w-sm text-center">{description}</p>}
        </div>
    );

    if (isTable) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center text-slate-400">
                    {content}
                </td>
            </tr>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-12">
            {content}
        </div>
    );
}
