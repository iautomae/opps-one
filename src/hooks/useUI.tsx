"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type MainCategory = 'dashboard' | 'tramites' | 'citas' | 'seguimiento' | 'terminados' | 'finanzas' | 'requerimientos' | 'settings' | 'admin' | null;

type UIContextType = {
    isSidebarCollapsed: boolean; // Primary sidebar (icons only)
    toggleSidebar: () => void;
    activeCategory: MainCategory;
    setActiveCategory: (cat: MainCategory) => void;
    isSubSidebarOpen: boolean;
    setSubSidebarOpen: (value: boolean) => void;
    toggleSubSidebar: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Default to thin sidebar
    const [activeCategory, setActiveCategoryState] = useState<MainCategory>(null);
    const [isSubSidebarOpen, setSubSidebarOpen] = useState(false);

    // Load preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            setIsSidebarCollapsed(saved === 'true');
        }

        // Auto-open sub-sidebar if a category was active (could be improved with path matching)
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebar-collapsed', String(newState));
            return newState;
        });
    };

    const setActiveCategory = (cat: MainCategory) => {
        if (activeCategory === cat && isSubSidebarOpen) {
            setSubSidebarOpen(false);
        } else {
            setActiveCategoryState(cat);
            setSubSidebarOpen(true);
        }
    };

    const toggleSubSidebar = () => {
        setSubSidebarOpen(prev => !prev);
    };

    return (
        <UIContext.Provider value={{
            isSidebarCollapsed,
            toggleSidebar,
            activeCategory,
            setActiveCategory,
            isSubSidebarOpen,
            setSubSidebarOpen,
            toggleSubSidebar
        }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
