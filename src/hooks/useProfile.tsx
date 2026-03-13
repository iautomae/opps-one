"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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
};

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    loading: true,
    updateProfile: async () => { },
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if (!user) {
                setProfile(null);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error || !data) {
                    if (error) {
                        console.error('Error fetching profile:', error.message);
                    } else {
                        console.warn('Profile not found, stale session?');
                    }

                    setProfile({
                        id: user.id,
                        email: user.email || '',
                        role: 'client',
                        features: {},
                        has_leads_access: false,
                        brand_logo: null,
                        empresa_id: null,
                        tenant_id: null,
                        empresa: null
                    });
                } else {
                    setProfile({
                        ...data,
                        email: data.email || user.email || ''
                    });
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
                        setProfile(prev => prev ? {
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
    }, [user]);

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user || !profile) return;

        try {
            // Optimistic update
            setProfile({ ...profile, ...updates });

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <ProfileContext.Provider value={{ profile, loading, updateProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    return useContext(ProfileContext);
}
