"use client";

import { useEffect, useMemo, useState } from 'react';
import { Shield, Mail, Bell, LockKeyhole, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

type SecuritySettingsState = {
    twoFactorEmail: string;
    twoFactorEnabled: boolean;
    allowedCountries: string[];
    notifyOnSuspicious: boolean;
    alertEmail: string;
    lastVerifiedAt: string | null;
    maskedTwoFactorEmail: string;
};

type ChangeStep = 'idle' | 'current_sent' | 'current_verified' | 'new_sent';

const DEFAULT_SETTINGS: SecuritySettingsState = {
    twoFactorEmail: '',
    twoFactorEnabled: false,
    allowedCountries: ['PE'],
    notifyOnSuspicious: true,
    alertEmail: '',
    lastVerifiedAt: null,
    maskedTwoFactorEmail: '',
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function ProfileSecurityPage() {
    const { profile } = useProfile();
    const [settings, setSettings] = useState<SecuritySettingsState>(DEFAULT_SETTINGS);
    const [newTwoFactorEmail, setNewTwoFactorEmail] = useState('');
    const [currentCode, setCurrentCode] = useState('');
    const [newEmailCode, setNewEmailCode] = useState('');
    const [currentChallengeId, setCurrentChallengeId] = useState('');
    const [newEmailChallengeId, setNewEmailChallengeId] = useState('');
    const [changeStep, setChangeStep] = useState<ChangeStep>('idle');
    const [maskedCurrentEmail, setMaskedCurrentEmail] = useState('');
    const [maskedNewEmail, setMaskedNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const currentSecurityEmail = useMemo(() => {
        return settings.twoFactorEmail || settings.maskedTwoFactorEmail || settings.alertEmail || profile?.email || '';
    }, [settings.alertEmail, settings.maskedTwoFactorEmail, settings.twoFactorEmail, profile?.email]);

    useEffect(() => {
        async function loadSettings() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const res = await fetch('/api/security/settings', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });

                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error || 'No se pudo cargar la seguridad.');
                }

                setSettings(json.settings || DEFAULT_SETTINGS);
            } catch (err: unknown) {
                setError(getErrorMessage(err, 'No se pudo cargar la seguridad.'));
            } finally {
                setLoading(false);
            }
        }

        loadSettings();
    }, []);

    function resetEmailChangeFlow() {
        setCurrentCode('');
        setNewEmailCode('');
        setCurrentChallengeId('');
        setNewEmailChallengeId('');
        setChangeStep('idle');
        setMaskedCurrentEmail('');
        setMaskedNewEmail('');
    }

    async function getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Tu sesion expiro.');
        return session.access_token;
    }

    async function saveBaseSettings(next: Partial<SecuritySettingsState>) {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            const accessToken = await getAccessToken();
            const payload = {
                notifyOnSuspicious: next.notifyOnSuspicious ?? settings.notifyOnSuspicious,
                alertEmail: next.alertEmail ?? settings.alertEmail,
                twoFactorEnabled: next.twoFactorEnabled ?? settings.twoFactorEnabled,
            };

            const res = await fetch('/api/security/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.error || 'No se pudo guardar la configuracion.');
            }

            setSettings((prev) => ({ ...prev, ...next }));
            setMessage('Configuracion guardada.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo guardar la configuracion.'));
        } finally {
            setSaving(false);
        }
    }

    async function sendCurrentEmailCode() {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (!newTwoFactorEmail.includes('@')) throw new Error('Ingresa el nuevo correo de doble acceso.');

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    step: 'current',
                    email: newTwoFactorEmail,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'No se pudo enviar el codigo.');
            }

            setCurrentChallengeId(json.challengeId);
            setMaskedCurrentEmail(json.maskedEmail || currentSecurityEmail);
            setChangeStep('current_sent');
            setMessage(`Te enviamos un codigo a ${json.maskedEmail || 'tu correo actual'}.`);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo enviar el codigo.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyCurrentEmailCode() {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (!currentChallengeId) throw new Error('Primero solicita el codigo al correo actual.');
            if (currentCode.length !== 6) throw new Error('Ingresa el codigo completo.');

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    step: 'current',
                    challengeId: currentChallengeId,
                    code: currentCode,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'No se pudo validar el correo actual.');
            }

            setChangeStep('current_verified');
            setMessage('Correo actual validado. Ahora confirma el nuevo correo.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo validar el codigo.'));
        } finally {
            setSaving(false);
        }
    }

    async function sendNewEmailCode() {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (!newTwoFactorEmail.includes('@')) throw new Error('Ingresa el nuevo correo de doble acceso.');
            if (!currentChallengeId || changeStep !== 'current_verified') {
                throw new Error('Primero valida el correo actual o de respaldo.');
            }

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    step: 'new',
                    email: newTwoFactorEmail,
                    currentChallengeId,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'No se pudo enviar el codigo al nuevo correo.');
            }

            setNewEmailChallengeId(json.challengeId);
            setMaskedNewEmail(json.maskedEmail || newTwoFactorEmail);
            setChangeStep('new_sent');
            setMessage(`Te enviamos un codigo a ${json.maskedEmail || newTwoFactorEmail}.`);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo enviar el codigo al nuevo correo.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyNewEmailCode() {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (!newEmailChallengeId) throw new Error('Primero solicita el codigo al nuevo correo.');
            if (newEmailCode.length !== 6) throw new Error('Ingresa el codigo completo.');

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    step: 'new',
                    challengeId: newEmailChallengeId,
                    currentChallengeId,
                    code: newEmailCode,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'No se pudo verificar el nuevo correo.');
            }

            setSettings((prev) => ({
                ...prev,
                twoFactorEmail: json.twoFactorEmail,
                maskedTwoFactorEmail: json.twoFactorEmail,
                twoFactorEnabled: true,
                lastVerifiedAt: new Date().toISOString(),
                alertEmail: json.twoFactorEmail,
            }));
            setNewTwoFactorEmail('');
            resetEmailChangeFlow();
            setMessage('Correo de doble acceso actualizado.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo verificar el nuevo correo.'));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <LoaderCircle className="animate-spin" size={18} />
                    Cargando seguridad...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-primary">Perfil</p>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-2">Seguridad de acceso</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                    Tu panel es privado. El acceso se valida desde Peru y puede requerir un codigo adicional al correo de seguridad.
                </p>
            </div>

            {(message || error) && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {error || message}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Pais permitido</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                En esta version el ingreso queda limitado a <strong>Peru</strong>.
                            </p>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Politica actual</p>
                        <p className="mt-2 text-sm font-semibold text-gray-800">Solo Peru ({settings.allowedCountries.join(', ')})</p>
                    </div>
                </section>

                <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Correo de doble acceso</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Cambiar este correo requiere validar primero el correo actual o de respaldo.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Estado actual</p>
                        <p className="mt-2 text-sm text-gray-700">
                            {settings.twoFactorEnabled
                                ? `Activo en ${settings.twoFactorEmail || settings.maskedTwoFactorEmail || 'correo verificado'}`
                                : `Aun no activado. Respaldo inicial: ${profile?.email || 'correo del perfil'}`}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Nuevo correo 2FA</label>
                        <input
                            type="email"
                            value={newTwoFactorEmail}
                            onChange={(e) => {
                                setNewTwoFactorEmail(e.target.value);
                                if (changeStep !== 'idle') resetEmailChangeFlow();
                            }}
                            placeholder="nombre@correo.com"
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                        <button
                            type="button"
                            onClick={sendCurrentEmailCode}
                            disabled={saving || !newTwoFactorEmail || changeStep !== 'idle'}
                            className="w-full rounded-2xl bg-brand-primary text-white font-bold px-4 py-3 disabled:opacity-50"
                        >
                            {saving && changeStep === 'idle' ? 'Enviando...' : 'Enviar codigo al correo actual'}
                        </button>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Codigo del correo actual</label>
                            {changeStep === 'current_verified' || changeStep === 'new_sent' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                    <CheckCircle2 size={14} />
                                    Validado
                                </span>
                            ) : null}
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={currentCode}
                            onChange={(e) => setCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            disabled={!currentChallengeId || changeStep === 'current_verified' || changeStep === 'new_sent'}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 tracking-[0.35em] text-center outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-50"
                        />
                        <button
                            type="button"
                            onClick={verifyCurrentEmailCode}
                            disabled={saving || !currentChallengeId || currentCode.length !== 6 || changeStep === 'current_verified' || changeStep === 'new_sent'}
                            className="w-full rounded-2xl border border-gray-300 text-gray-900 font-bold px-4 py-3 disabled:opacity-50"
                        >
                            {saving && changeStep === 'current_sent' ? 'Validando...' : `Validar ${maskedCurrentEmail || 'correo actual'}`}
                        </button>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                        <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Codigo del nuevo correo</label>
                        <button
                            type="button"
                            onClick={sendNewEmailCode}
                            disabled={saving || changeStep !== 'current_verified'}
                            className="w-full rounded-2xl bg-gray-900 text-white font-bold px-4 py-3 disabled:opacity-50"
                        >
                            {saving && changeStep === 'current_verified' ? 'Enviando...' : 'Enviar codigo al nuevo correo'}
                        </button>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={newEmailCode}
                            onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            disabled={!newEmailChallengeId}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 tracking-[0.35em] text-center outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-50"
                        />
                        <button
                            type="button"
                            onClick={verifyNewEmailCode}
                            disabled={saving || !newEmailChallengeId || newEmailCode.length !== 6}
                            className="w-full rounded-2xl border border-gray-300 text-gray-900 font-bold px-4 py-3 disabled:opacity-50"
                        >
                            {saving && changeStep === 'new_sent' ? 'Verificando...' : `Confirmar ${maskedNewEmail || 'nuevo correo'}`}
                        </button>
                    </div>
                </section>
            </div>

            <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Alertas de acceso sospechoso</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Si se detecta un intento desde un pais no permitido, enviaremos una notificacion al correo configurado.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Correo de alerta</label>
                        <input
                            type="email"
                            value={settings.alertEmail}
                            onChange={(e) => setSettings((prev) => ({ ...prev, alertEmail: e.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={settings.notifyOnSuspicious}
                            onChange={(e) => setSettings((prev) => ({ ...prev, notifyOnSuspicious: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-gray-700">Notificar por correo</span>
                    </label>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => saveBaseSettings({
                            alertEmail: settings.alertEmail,
                            notifyOnSuspicious: settings.notifyOnSuspicious,
                        })}
                        disabled={saving}
                        className="rounded-2xl bg-gray-900 text-white font-bold px-5 py-3 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar alertas'}
                    </button>
                    <button
                        type="button"
                        onClick={() => saveBaseSettings({ twoFactorEnabled: !settings.twoFactorEnabled })}
                        disabled={saving || !settings.twoFactorEmail}
                        className="rounded-2xl border border-gray-300 text-gray-900 font-bold px-5 py-3 disabled:opacity-50 flex items-center gap-2"
                    >
                        <LockKeyhole size={16} />
                        {settings.twoFactorEnabled ? 'Desactivar doble verificacion' : 'Activar doble verificacion'}
                    </button>
                </div>
            </section>
        </div>
    );
}
