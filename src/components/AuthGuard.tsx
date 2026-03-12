"use client";

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { UserProfile } from '@/hooks/useProfile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';

function hasAnyPlatformAccess(profile: NonNullable<UserProfile>): boolean {
    if (profile.has_leads_access) return true;
    if (profile.features && Object.values(profile.features).some(v => v === true)) return true;
    return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const pathname = usePathname();

    const isLoading = authLoading || (user && profileLoading);

    useEffect(() => {
        if (!isLoading) {
            // Case 1: No user → Login (permit public routes)
            if (!user && pathname !== '/login' && !pathname.endsWith('/set-password')) {
                router.push('/login');
                return;
            }

            if (user && profile) {
                // Super admin always has full access
                if (profile.role === 'admin') return;

                // Check if tenant_owner/user has any platform enabled
                const hasAccess = hasAnyPlatformAccess(profile);

                if (hasAccess) {
                    // If they are on pending-approval but already have access, redirect to first available
                    if (pathname === '/pending-approval') {
                        const firstRoute = getFirstAvailableRoute(profile);
                        router.push(firstRoute);
                        return;
                    }

                    // Route protection: prevent access to pages without the matching feature
                    if (pathname.startsWith('/leads') && !profile.has_leads_access && !profile.features?.['leads']) {
                        router.push(getFirstAvailableRoute(profile));
                        return;
                    }
                    if (pathname.startsWith('/tramites') && !profile.features?.['tramites']) {
                        router.push(getFirstAvailableRoute(profile));
                        return;
                    }
                    // Block admin routes for non-admins
                    if (pathname.startsWith('/admin')) {
                        router.push(getFirstAvailableRoute(profile));
                        return;
                    }
                } else {
                    // No access at all → Pending Approval
                    if (pathname !== '/pending-approval') {
                        router.push('/pending-approval');
                        return;
                    }
                }
            }
        }
    }, [user, profile, isLoading, router, pathname]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-[110]">
                <div className="flex flex-col items-center gap-4">
                    <LoaderCircle className="animate-spin text-brand-turquoise" size={48} />
                    <span className="text-white/40 text-xs font-bold tracking-widest uppercase animate-pulse">Autenticando...</span>
                </div>
            </div>
        );
    }

    // Protection during redirection
    if (!user && pathname !== '/login' && !pathname.endsWith('/set-password')) return null;
    if (user && profile && profile.role !== 'admin' && !hasAnyPlatformAccess(profile) && pathname !== '/pending-approval') return null;

    return <>{children}</>;
}

function getFirstAvailableRoute(profile: NonNullable<UserProfile>): string {
    if (profile.has_leads_access || profile.features?.['leads']) return '/leads';
    if (profile.features?.['tramites']) return '/tramites';
    if (profile.features?.['dashboard']) return '/dashboard';
    // Fallback: find first enabled feature
    const enabledFeature = Object.entries(profile.features || {}).find(([, v]) => v === true);
    if (enabledFeature) return `/${enabledFeature[0]}`;
    return '/pending-approval';
}
