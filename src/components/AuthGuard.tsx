"use client";

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const pathname = usePathname();

    const isLoading = authLoading || (user && profileLoading);

    useEffect(() => {
        if (!isLoading) {
            // Case 1: No user at all -> Login (Permiting public routes)
            if (!user && pathname !== '/login' && !pathname.endsWith('/set-password')) {
                router.push('/login');
                return;
            }

            // Simple Rule: If user has leads access or tramites feature, they are approved.
            // Otherwise, they go to pending-approval.
            if (user && profile) {
                const hasAnyAccess = profile.has_leads_access || profile.features?.['tramites'];

                if (hasAnyAccess) {
                    // If they are specifically in pending-approval but ALREADY have access, move them out
                    if (pathname === '/pending-approval') {
                        router.push(profile.has_leads_access ? '/leads' : '/tramites');
                        return;
                    }
                    // Protection: If they try to go to pages they don't have access to (docs/forms skeletons)
                    if (pathname.startsWith('/documents') || pathname.startsWith('/forms')) {
                        router.push(profile.has_leads_access ? '/leads' : '/tramites');
                        return;
                    }

                    // Strict boundary protection
                    if (pathname.startsWith('/leads') && !profile.has_leads_access) {
                        router.push('/tramites');
                        return;
                    }
                    if (pathname.startsWith('/tramites') && !profile.features?.['tramites']) {
                        router.push('/leads');
                        return;
                    }

                } else {
                    // No access -> Pending Approval
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
                    <Loader2 className="animate-spin text-brand-turquoise" size={48} />
                    <span className="text-white/40 text-xs font-bold tracking-widest uppercase animate-pulse">Autenticando...</span>
                </div>
            </div>
        );
    }

    // Protection during redirection
    if (!user && pathname !== '/login' && !pathname.endsWith('/set-password')) return null;
    if (user && profile && !profile.has_leads_access && !profile.features?.['tramites'] && pathname !== '/pending-approval') return null;

    return <>{children}</>;
}
