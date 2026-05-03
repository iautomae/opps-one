"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, LoaderCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export function ScreenLockOverlay({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [timeoutMinutes, setTimeoutMinutes] = useState(0);

    const loadLockSettings = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/security/settings', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setHasPin(json.settings.hasLockPin);
                setTimeoutMinutes(json.settings.lockTimeoutMinutes || 0);
                
                // Check if already locked in this session
                const lockedAt = sessionStorage.getItem('app_locked_at');
                if (lockedAt && json.settings.hasLockPin) {
                    setIsLocked(true);
                }
            }
        } catch (e) {
            console.error('Error loading lock settings:', e);
        }
    }, []);

    useEffect(() => {
        const handleManualLock = () => {
            if (hasPin) {
                setIsLocked(true);
                sessionStorage.setItem('app_locked_at', new Date().toISOString());
            }
        };

        window.addEventListener('app-lock', handleManualLock);
        return () => window.removeEventListener('app-lock', handleManualLock);
    }, [hasPin]);

    useEffect(() => {
        loadLockSettings();
    }, [loadLockSettings]);

    const handleLock = useCallback(() => {
        if (hasPin && !isLocked) {
            setIsLocked(true);
            sessionStorage.setItem('app_locked_at', new Date().toISOString());
        }
    }, [hasPin, isLocked]);

    useIdleTimeout(timeoutMinutes, handleLock);

    const handleUnlock = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (pin.length < 6) return;

        setVerifying(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/security/verify-pin', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ pin })
            });

            const json = await res.json();
            if (res.ok && json.valid) {
                setIsLocked(false);
                setPin('');
                sessionStorage.removeItem('app_locked_at');
            } else {
                setError(json.error || 'PIN incorrecto');
                setPin('');
            }
        } catch (err) {
            setError('Error al verificar el PIN');
        } finally {
            setVerifying(false);
        }
    };

    if (!isLocked) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-turquoise/5 to-transparent pointer-events-none" />
            
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500 text-center">
                <div className="w-20 h-20 bg-brand-turquoise/10 text-brand-turquoise rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(44,219,155,0.2)]">
                    <Lock size={40} />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Sesión Bloqueada</h2>
                <p className="text-slate-400 text-sm mb-8">Ingresa tu PIN de acceso rápido para continuar.</p>
                
                <form onSubmit={handleUnlock} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs flex items-center gap-2 justify-center animate-shake">
                            <ShieldAlert size={14} />
                            {error}
                        </div>
                    )}
                    
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            maxLength={8}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="******"
                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-12 py-4 text-white text-2xl tracking-[0.5em] text-center focus:ring-2 focus:ring-brand-turquoise/50 focus:border-brand-turquoise outline-none transition-all"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={verifying || pin.length < 6}
                        className="w-full bg-brand-turquoise text-black font-bold py-4 rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(44,219,155,0.2)]"
                    >
                        {verifying ? (
                            <LoaderCircle className="animate-spin" size={20} />
                        ) : (
                            'Desbloquear'
                        )}
                    </button>
                </form>
                
                <button 
                    onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                    }}
                    className="mt-8 text-xs text-slate-500 hover:text-white transition-colors"
                >
                    Cerrar sesión completamente
                </button>
            </div>
        </div>
    );
}
