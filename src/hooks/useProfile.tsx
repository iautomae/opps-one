"use client";

import { useEffect, useState } from 'react';
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
    role: 'admin' | 'client';
    features: Record<string, boolean>;
    has_leads_access: boolean;
    brand_logo?: string | null;
    empresa_id: string | null;
    tenant_id: string | null;
    empresa?: Company | null;
} | null;

export function useProfile() {
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
                        // Optionally sign out the user if profile completely missing:
                        // await supabase.auth.signOut();
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
                    // Merge auth email into profile for UI consistency
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
            // Revert on error (could be handled better with previous state, but sufficient for now)
        }
    };

    return { profile, loading, updateProfile };
}
