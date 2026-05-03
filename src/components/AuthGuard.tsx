"use client";

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { UserProfile } from '@/hooks/useProfile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

const FEATURE_ROUTE_MAP: Record<string, string> = {
    leads: '/leads',
    tramites: '/tramites',
    reclutamiento: '/reclutamiento',
    textil: '/textil',
    dashboard: '/dashboard',
};

type SecurityState = 'checking' | 'verified' | 'blocked' | 'needs_login';

function featureKeyToRoute(key: string): string | null {
    if (FEATURE_ROUTE_MAP[key]) return FEATURE_ROUTE_MAP[key];
    for (const [routeKey, route] of Object.entries(FEATURE_ROUTE_MAP)) {
        if (key.includes(routeKey)) return route;
    }
    return null;
}

function hasFeatureForRoute(profile: NonNullable<UserProfile>, routePrefix: string): boolean {
    const routeKey = routePrefix.replace(/^\//, '');
    if (routeKey === 'leads' && profile.has_leads_access) return true;
    if (!profile.features) return false;

    return Object.entries(profile.features).some(
        ([key, val]) => val === true && (key === routeKey || key.includes(routeKey))
    );
}

function hasAnyPlatformAccess(profile: NonNullable<UserProfile>): boolean {
    if (profile.has_leads_access) return true;
    if (profile.features && Object.values(profile.features).some((value) => value === true)) return true;
    return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading, session, signOut } = useAuth();
    const { profile, loading: profileLoading, realProfile, isImpersonating } = useProfile();
    const router = useRouter();
    const pathname = usePathname();

    const isLoading = authLoading || (user && profileLoading);
    const [securityState, setSecurityState] = useState<SecurityState>('checking');

    useEffect(() => {
        let active = true;

        async function checkSecurity() {
            if (!user || !session?.access_token) {
                if (active) setSecurityState('needs_login');
                return;
            }

            try {
                const res = await fetch('/api/security/session-status', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });

                const json = await res.json().catch(() => ({}));

                if (!active) return;

                if (res.ok && json.status === 'verified') {
                    setSecurityState('verified');
                    return;
                }

                // Si estamos en la página de login, no redirigimos para no causar bucles
                if (pathname.includes('/login')) {
                    setSecurityState('blocked');
                    return;
                }

                if (json.status === 'blocked_country') {
                    await signOut();
                    setSecurityState('blocked');
                    router.push('/login?security=blocked_country');
                    return;
                }

                if (json.status === 'requires_2fa') {
                    setSecurityState('blocked');
                    router.push('/login?step=verify');
                    return;
                }

                setSecurityState('blocked');
                router.push('/login');
            } catch (error) {
                console.error('Error checking security session:', error);
                if (active) {
                    setSecurityState('blocked');
                }
            }
        }

        if (!isLoading) {
            const isAuthPage = pathname.includes('/login') || pathname.endsWith('/set-password');
            
            if (!user && !isAuthPage) {
                router.push('/login');
                return;
            }

            if (user) {
                setSecurityState(prev => prev === 'verified' ? 'verified' : 'checking');
                checkSecurity();
            }
        }

        return () => {
            active = false;
        };
    }, [isLoading, user, session?.access_token, pathname, router, signOut]);

    useEffect(() => {
        if (isLoading || securityState !== 'verified') {
            return;
        }

        if (user && profile) {
            if (isImpersonating) return;
            if (realProfile?.role === 'admin') return;

            const hasAccess = hasAnyPlatformAccess(profile);

            if (hasAccess) {
                if (pathname === '/pending-approval') {
                    router.push(getFirstAvailableRoute(profile));
                    return;
                }

                if (pathname.startsWith('/leads') && !hasFeatureForRoute(profile, 'leads')) {
                    router.push(getFirstAvailableRoute(profile));
                    return;
                }

                if (pathname.startsWith('/tramites') && !hasFeatureForRoute(profile, 'tramites')) {
                    router.push(getFirstAvailableRoute(profile));
                    return;
                }

                if (pathname.startsWith('/admin')) {
                    router.push(getFirstAvailableRoute(profile));
                    return;
                }
            } else if (pathname !== '/pending-approval') {
                router.push('/pending-approval');
            }
        }
    }, [user, profile, isLoading, router, pathname, securityState, realProfile?.role, isImpersonating]);

    if (isLoading || (user && securityState === 'checking')) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-[110]">
                <div className="flex flex-col items-center gap-4">
                    <LoaderCircle className="animate-spin text-brand-turquoise" size={48} />
                    <span className="text-white/40 text-xs font-bold tracking-widest uppercase animate-pulse">
                        Verificando seguridad...
                    </span>
                </div>
            </div>
        );
    }

    if (!user && pathname !== '/login' && !pathname.endsWith('/set-password')) return null;
    if (user && securityState !== 'verified') return null;
    if (user && profile && !isImpersonating && realProfile?.role !== 'admin' && !hasAnyPlatformAccess(profile) && pathname !== '/pending-approval') return null;

    return <>{children}</>;
}

function getFirstAvailableRoute(profile: NonNullable<UserProfile>): string {
    if (profile.has_leads_access) return '/leads';

    const enabledFeatures = Object.entries(profile.features || {}).filter(([, value]) => value === true);
    for (const [key] of enabledFeatures) {
        const route = featureKeyToRoute(key);
        if (route) return route;
    }

    if (enabledFeatures.length > 0) return '/leads';
    return '/pending-approval';
}
