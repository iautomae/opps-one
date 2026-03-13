"use client";

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { UserProfile } from '@/hooks/useProfile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';

// Map feature keys (which may be custom platform names) to actual app routes
// Feature keys are normalized: lowercase + NFD strip + underscores
// e.g. "Escolta Leads" → "escolta_leads" should route to /leads
const FEATURE_ROUTE_MAP: Record<string, string> = {
    leads: '/leads',
    tramites: '/tramites',
    reclutamiento: '/reclutamiento',
    textil: '/textil',
    dashboard: '/dashboard',
};

function featureKeyToRoute(key: string): string | null {
    // Direct match
    if (FEATURE_ROUTE_MAP[key]) return FEATURE_ROUTE_MAP[key];
    // Partial match: if the key contains a known route keyword (e.g. "escolta_leads" contains "leads")
    for (const [routeKey, route] of Object.entries(FEATURE_ROUTE_MAP)) {
        if (key.includes(routeKey)) return route;
    }
    return null;
}

function hasFeatureForRoute(profile: NonNullable<UserProfile>, routePrefix: string): boolean {
    // Strip leading slash: "/leads" → "leads"
    const routeKey = routePrefix.replace(/^\//, '');
    if (routeKey === 'leads' && profile.has_leads_access) return true;
    if (!profile.features) return false;
    // Check direct key or any key that contains the route keyword
    return Object.entries(profile.features).some(
        ([key, val]) => val === true && (key === routeKey || key.includes(routeKey))
    );
}

function hasAnyPlatformAccess(profile: NonNullable<UserProfile>): boolean {
    if (profile.has_leads_access) return true;
    if (profile.features && Object.values(profile.features).some(v => v === true)) return true;
    return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading, realProfile, isImpersonating } = useProfile();
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
                // Admin impersonating → skip all route guards (admin has full access)
                if (isImpersonating) return;
                // Super admin always has full access
                if (realProfile?.role === 'admin') return;

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
                    if (pathname.startsWith('/leads') && !hasFeatureForRoute(profile, 'leads')) {
                        router.push(getFirstAvailableRoute(profile));
                        return;
                    }
                    if (pathname.startsWith('/tramites') && !hasFeatureForRoute(profile, 'tramites')) {
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
    if (user && profile && !isImpersonating && realProfile?.role !== 'admin' && !hasAnyPlatformAccess(profile) && pathname !== '/pending-approval') return null;

    return <>{children}</>;
}

function getFirstAvailableRoute(profile: NonNullable<UserProfile>): string {
    if (profile.has_leads_access) return '/leads';
    // Check all enabled features and map them to known routes
    const enabledFeatures = Object.entries(profile.features || {}).filter(([, v]) => v === true);
    for (const [key] of enabledFeatures) {
        const route = featureKeyToRoute(key);
        if (route) return route;
    }
    // If there are enabled features but none map to a known route, go to leads as fallback
    if (enabledFeatures.length > 0) return '/leads';
    return '/pending-approval';
}
