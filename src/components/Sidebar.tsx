"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  Layers,
  Lock,
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
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', feature: 'dashboard' },
  { id: 'tramites', icon: FileText, label: 'Trámites', feature: 'tramites' },
  { id: 'leads', icon: Users, label: 'Leads', href: '/leads', feature: 'leads' },
  { id: 'citas', icon: Calendar, label: 'Citas', href: '/citas', feature: 'citas' },
  { id: 'seguimiento', icon: Activity, label: 'Seguimiento', href: '/seguimiento', feature: 'seguimiento' },
  { id: 'terminados', icon: CheckCircle, label: 'Terminados', href: '/terminados', feature: 'terminados' },
  { id: 'finanzas', icon: Receipt, label: 'Finanzas', href: '/finanzas', feature: 'finanzas' },
  { id: 'requerimientos', icon: ClipboardList, label: 'Requerimientos', href: '/requerimientos', feature: 'requerimientos' },
];

// Menú exclusivo para el Super Admin (dueño de la plataforma)
const ADMIN_MENU: MenuItem[] = [
  { id: 'admin', icon: Users, label: 'Usuarios', href: '/admin' },
  { id: 'plataformas', icon: Layers, label: 'Plataformas', href: '/admin/plataformas' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Super admin → menú de admin (Usuarios, Plataformas)
  // Tenant owner / user → menú filtrado por features habilitadas
  // Feature keys may be custom names (e.g. "escolta_leads") so we match by keyword inclusion
  const hasFeature = (featureKey: string): boolean => {
    if (featureKey === 'leads' && profile?.has_leads_access) return true;
    if (!profile?.features) return false;
    // Direct match or any key that contains the feature keyword
    return Object.entries(profile.features).some(
      ([key, val]) => val === true && (key === featureKey || key.includes(featureKey))
    );
  };

  const visibleMenu = profile?.role === 'admin'
    ? ADMIN_MENU
    : PRIMARY_MENU.filter(item => {
      if (!item.feature) return true;
      return hasFeature(item.feature);
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
                  const viewAs = searchParams.get('view_as');
                  const target = viewAs ? `${item.href}${item.href.includes('?') ? '&' : '?'}view_as=${viewAs}` : item.href;
                  router.push(target);
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
      <div className="mt-auto flex flex-col gap-2 relative">
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
          {/* Tooltip */}
          <div className="absolute left-[70px] bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 shadow-xl whitespace-nowrap">
            Seguridad
          </div>
        </button>

        <div className="relative group/logout">
          <button
            className="w-12 h-12 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all duration-300 group relative"
          >
            <LogOut size={20} />
          </button>

          {/* Logout/Lock Dropdown */}
          <div className="absolute bottom-0 left-[60px] mb-0 opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible group-hover/logout:translate-x-2 transition-all duration-200 z-[100]">
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 p-2 min-w-[140px] flex flex-col gap-1 animate-in slide-in-from-left-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('app-lock'))}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-all text-left"
              >
                <Lock size={14} />
                Bloquear
              </button>
              <div className="h-[1px] bg-slate-100 mx-2" />
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all text-left"
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
