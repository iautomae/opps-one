"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Settings,
  LogOut,
  Upload,
  Shield,
  Calendar,
  MapPin,
  FileText,
  LayoutDashboard,
  Activity,
  CheckCircle,
  Receipt,
  ClipboardList,
  type LucideIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUI, type MainCategory } from '@/hooks/useUI';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuItem {
  id: MainCategory;
  icon: LucideIcon;
  label: string;
  href?: string;
  permission?: string;
  feature?: string;
}

const PRIMARY_MENU: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { id: 'tramites', icon: FileText, label: 'Trámites' },
  { id: 'citas', icon: Calendar, label: 'Citas', href: '/citas' },
  { id: 'seguimiento', icon: Activity, label: 'Seguimiento', href: '/seguimiento' },
  { id: 'terminados', icon: CheckCircle, label: 'Terminados', href: '/terminados' },
  { id: 'finanzas', icon: Receipt, label: 'Finanzas', href: '/finanzas' },
  { id: 'requerimientos', icon: ClipboardList, label: 'Requerimientos', href: '/requerimientos' },
  { id: 'admin', icon: Shield, label: 'Panel Maestro', href: '/admin', permission: 'admin_only' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { activeCategory, setActiveCategory, isSubSidebarOpen, setSubSidebarOpen } = useUI();

  // USER: Change this URL to your default logo image path
  const DEFAULT_LOGO_URL = "/brand/logo.jpg";
  const [logo, setLogo] = useState(DEFAULT_LOGO_URL);

  useEffect(() => {
    if (profile?.brand_logo) {
      setLogo(profile.brand_logo);
    }
  }, [profile]);

  const loading = authLoading || (user && profileLoading);

  if (loading || !user || pathname === '/login' || pathname === '/pending-approval') return null;

  // Filter menu based on permissions AND features
  const visibleMenu = PRIMARY_MENU.filter(item => {
    // Admin only routes
    if (item.permission === 'admin_only') {
      return profile?.role === 'admin';
    }

    // Feature-flagged routes
    if (item.feature) {
      return profile?.features?.[item.feature] === true;
    }

    // Standard permission routes
    if (item.permission) {
      return profile?.[item.permission as keyof typeof profile] === true;
    }

    return true;
  });


  return (
    <div className="fixed left-4 top-4 bottom-4 w-20 bg-sidebar rounded-2xl shadow-2xl shadow-black/5 border border-slate-100 flex flex-col items-center py-8 z-[60] select-none transition-all duration-300">
      {/* Brand Logo - Swappable */}
      <div className="mb-10 relative group/logo-container">
        <button
          onClick={() => document.getElementById('logo-upload')?.click()}
          className="relative z-10 flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
        >
          <Image
            src={logo}
            alt="Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-cover bg-white"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo-container:opacity-100 flex items-center justify-center transition-opacity rounded-lg backdrop-blur-[1px]">
            <Upload size={14} className="text-white" />
          </div>
        </button>
        <input
          type="file"
          id="logo-upload"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                setLogo(base64); // Optimistic UI update
                updateProfile({ brand_logo: base64 }); // Persist to DB
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {visibleMenu.map((item) => {
          const isActive = activeCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveCategory(item.id);
                if (item.href) {
                  setSubSidebarOpen(false);
                  router.push(item.href);
                } else {
                  // Toggle subsidebar if clicking the same active category, else just open it
                  setSubSidebarOpen(isActive ? !isSubSidebarOpen : true);
                }
              }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group relative border-2",
                isActive
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm"
                  : "border-transparent text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5"
              )}
            >
              <item.icon
                size={20}
                className="relative z-10"
              />

              {/* Tooltip */}
              <div className="absolute left-[70px] bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 shadow-xl whitespace-nowrap">
                {item.label}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => setActiveCategory('settings')}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group relative border-2",
            activeCategory === 'settings'
              ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm"
              : "border-transparent text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5"
          )}
          style={activeCategory === 'settings' ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
        >
          <Settings
            size={20}
            style={activeCategory === 'settings' ? { color: '#14b8a6' } : {}}
          />
        </button>
        <button
          onClick={() => signOut()}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all duration-300 group relative"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
