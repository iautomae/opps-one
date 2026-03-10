import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface TabItem<T extends string> {
    id: T;
    label: string;
    count?: number;
    activeTextColorClass?: string;
    inactiveHoverTextColorClass?: string;
}

interface FilterTabsProps<T extends string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onChange: (tabId: T) => void;
    className?: string;
}

export function FilterTabs<T extends string>({ tabs, activeTab, onChange, className }: FilterTabsProps<T>) {
    return (
        <div className={cn("flex bg-gray-300/60 p-1 rounded-xl shadow-sm border border-gray-100/30", className)}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const activeColor = tab.activeTextColorClass || "text-gray-900";
                const inactiveColor = tab.inactiveHoverTextColorClass || "hover:text-gray-900";

                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                            isActive
                                ? `bg-white shadow-sm ${activeColor}`
                                : `text-gray-500 ${inactiveColor}`
                        )}
                    >
                        {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
                    </button>
                );
            })}
        </div>
    );
}
