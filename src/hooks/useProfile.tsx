"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Company = {
    id: string;
    nombre: string;
    nicho: 'libreria' | 'restaurante' | 'general';
    configuracion: Record<string, unknown>;
};

export type UserProfile = {
    id: string;
    email: string;
    full_name?: string;
    role: 'admin' | 'tenant_owner' | 'client';
    features: Record<string, boolean>;
    has_leads_access: boolean;
    brand_logo?: string | null;
    empresa_id: string | null;
    tenant_id: string | null;
    empresa?: Company | null;
} | null;

type ProfileContextType = {
    profile: UserProfile;
    loading: boolean;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    /** When impersonating, this holds the real admin profile */
    realProfile: UserProfile;
    /** True when viewing as another user */
    isImpersonating: boolean;
    /** Stop impersonating */
    exitImpersonation: () => void;
};

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    loading: true,
    updateProfile: async () => { },
    realProfile: null,
    isImpersonating: false,
    exitImpersonation: () => { },
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const viewAsUid = searchParams.get('view_as');

    const [profile, setProfile] = useState<UserProfile>(null);
    const [realProfile, setRealProfile] = useState<UserProfile>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if (!user) {
                setProfile(null);
                setRealProfile(null);
                setLoading(false);
                return;
            }

            try {
                // Always fetch the real logged-in user's profile first
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                const myProfile: UserProfile = (error || !data) ? {
                    id: user.id,
                    email: user.email || '',
                    role: 'client',
                    features: {},
                    has_leads_access: false,
                    brand_logo: null,
                    empresa_id: null,
                    tenant_id: null,
                    empresa: null
                } : {
                    ...data,
                    email: data.email || user.email || ''
                };

                setRealProfile(myProfile);

                // If admin is impersonating another user via ?view_as=
                if (viewAsUid && myProfile.role === 'admin' && viewAsUid !== user.id) {
                    const { data: targetData, error: targetError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', viewAsUid)
                        .maybeSingle();

                    if (!targetError && targetData) {
                        setProfile({
                            ...targetData,
                            email: targetData.email || ''
                        });
                    } else {
                        // Target not found, fall back to own profile
                        setProfile(myProfile);
                    }
                } else {
                    setProfile(myProfile);
                }
            } catch (err) {
                console.error('Unexpected error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();

        // Realtime: refresh profile when permissions change
        if (user) {
            const channel = supabase
                .channel(`profile-updates-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`,
                    },
                    (payload) => {
                        const updated = payload.new as Record<string, unknown>;
                        if (!viewAsUid) {
                            setProfile(prev => prev ? {
                                ...prev,
                                ...updated,
                                email: (updated.email as string) || prev.email,
                            } : prev);
                        }
                        setRealProfile(prev => prev ? {
                            ...prev,
                            ...updated,
                            email: (updated.email as string) || prev.email,
                        } : prev);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user, viewAsUid]);

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user || !profile) return;

        try {
            // Optimistic update
            setProfile({ ...profile, ...updates });

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const isImpersonating = !!(viewAsUid && realProfile?.role === 'admin' && profile?.id !== realProfile?.id);

    const exitImpersonation = () => {
        // Remove view_as from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('view_as');
        window.location.href = url.toString();
    };

    return (
        <ProfileContext.Provider value={{ profile, loading, updateProfile, realProfile, isImpersonating, exitImpersonation }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    return useContext(ProfileContext);
}
