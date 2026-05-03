"use client";

import { useEffect, useState } from 'react';
import { Shield, Bell, LockKeyhole, LoaderCircle, CheckCircle2, X, ArrowRight, ShieldCheck, ShieldAlert, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

type SecuritySettingsState = {
    twoFactorEmail: string;
    twoFactorEnabled: boolean;
    allowedCountries: string[];
    notifyOnSuspicious: boolean;
    alertEmail: string; // 'primary', '2fa', 'both'
    lastVerifiedAt: string | null;
    maskedTwoFactorEmail: string;
};

type ChangeStep = 'idle' | 'current_sent' | 'current_verified' | 'new_sent';

const DEFAULT_SETTINGS: SecuritySettingsState = {
    twoFactorEmail: '',
    twoFactorEnabled: false,
    allowedCountries: ['PE'],
    notifyOnSuspicious: true,
    alertEmail: 'primary',
    lastVerifiedAt: null,
    maskedTwoFactorEmail: '',
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function ProfileSecurityPage() {
    const { profile } = useProfile();
    const [settings, setSettings] = useState<SecuritySettingsState>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Modal Visibility States
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

    // Form States
    const [newTwoFactorEmail, setNewTwoFactorEmail] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_newEmail') || '' : '');
    const [currentCode, setCurrentCode] = useState('');
    const [newEmailCode, setNewEmailCode] = useState('');
    const [currentChallengeId, setCurrentChallengeId] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_currentChallenge') || '' : '');
    const [newEmailChallengeId, setNewEmailChallengeId] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_newChallenge') || '' : '');
    const [changeStep, setChangeStep] = useState<ChangeStep>(() => typeof window !== 'undefined' ? (sessionStorage.getItem('2fa_step') as ChangeStep) || 'idle' : 'idle');
    const [maskedCurrentEmail, setMaskedCurrentEmail] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_maskedCurrent') || '' : '');
    const [maskedNewEmail, setMaskedNewEmail] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_maskedNew') || '' : '');
    
    const [disableStep, setDisableStep] = useState<'idle' | 'sent'>(() => typeof window !== 'undefined' ? (sessionStorage.getItem('2fa_disableStep') as 'idle' | 'sent') || 'idle' : 'idle');
    const [disableCode, setDisableCode] = useState('');
    const [disableChallengeId, setDisableChallengeId] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_disableChallenge') || '' : '');

    const [alertsStep, setAlertsStep] = useState<'idle' | 'sent'>(() => typeof window !== 'undefined' ? (sessionStorage.getItem('2fa_alertsStep') as 'idle' | 'sent') || 'idle' : 'idle');
    const [alertsCode, setAlertsCode] = useState('');
    const [alertsChallengeId, setAlertsChallengeId] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('2fa_alertsChallenge') || '' : '');
    const [tempAlertSettings, setTempAlertSettings] = useState<{notifyOnSuspicious: boolean, alertEmail: string} | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('2fa_newEmail', newTwoFactorEmail);
            sessionStorage.setItem('2fa_currentChallenge', currentChallengeId);
            sessionStorage.setItem('2fa_newChallenge', newEmailChallengeId);
            sessionStorage.setItem('2fa_step', changeStep);
            sessionStorage.setItem('2fa_maskedCurrent', maskedCurrentEmail);
            sessionStorage.setItem('2fa_maskedNew', maskedNewEmail);
            sessionStorage.setItem('2fa_disableStep', disableStep);
            sessionStorage.setItem('2fa_disableChallenge', disableChallengeId);
            sessionStorage.setItem('2fa_alertsStep', alertsStep);
            sessionStorage.setItem('2fa_alertsChallenge', alertsChallengeId);
        }
    }, [newTwoFactorEmail, currentChallengeId, newEmailChallengeId, changeStep, maskedCurrentEmail, maskedNewEmail, disableStep, disableChallengeId, alertsStep, alertsChallengeId]);

    useEffect(() => {
        if (changeStep !== 'idle') setIsChangeModalOpen(true);
        if (disableStep !== 'idle') setIsDisableModalOpen(true);
        if (alertsStep !== 'idle') setIsAlertsModalOpen(true);
    }, [changeStep, disableStep, alertsStep]);

    useEffect(() => {
        async function loadSettings() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const res = await fetch('/api/security/settings', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });

                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'No se pudo cargar la seguridad.');

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
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('2fa_newEmail');
            sessionStorage.removeItem('2fa_currentChallenge');
            sessionStorage.removeItem('2fa_newChallenge');
            sessionStorage.removeItem('2fa_step');
            sessionStorage.removeItem('2fa_maskedCurrent');
            sessionStorage.removeItem('2fa_maskedNew');
        }
    }

    function resetDisableFlow() {
        setDisableCode('');
        setDisableChallengeId('');
        setDisableStep('idle');
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('2fa_disableStep');
            sessionStorage.removeItem('2fa_disableChallenge');
        }
    }

    function resetAlertsFlow() {
        setAlertsCode('');
        setAlertsChallengeId('');
        setAlertsStep('idle');
        setTempAlertSettings(null);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('2fa_alertsStep');
            sessionStorage.removeItem('2fa_alertsChallenge');
        }
    }

    async function getAccessToken() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Tu sesion expiro.');
        return session.access_token;
    }

    // Usado directamente cuando no hay 2FA, o en endpoints que no requieren confirmación adicional.
    async function saveBaseSettings(next: Partial<SecuritySettingsState>) {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            const accessToken = await getAccessToken();
            const payload = {
                notifyOnSuspicious: next.notifyOnSuspicious ?? settings.notifyOnSuspicious,
                alertEmail: next.alertEmail ?? settings.alertEmail,
            };

            const res = await fetch('/api/security/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'No se pudo guardar la configuracion.');

            setSettings((prev) => ({ ...prev, ...next }));
            setMessage('Configuracion guardada correctamente.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo guardar la configuracion.'));
        } finally {
            setSaving(false);
        }
    }

    function handleAlertChange(nextSettings: {notifyOnSuspicious: boolean, alertEmail: string}) {
        if (!settings.twoFactorEnabled) {
            saveBaseSettings(nextSettings);
            return;
        }
        setTempAlertSettings(nextSettings);
        setIsAlertsModalOpen(true);
    }

    async function sendAlertsCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'alerts' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo solicitar el código para alertas.');

            setAlertsChallengeId(json.challengeId);
            setAlertsStep('sent');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo solicitar el código.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyAlertsCode() {
        if (!tempAlertSettings) return;
        setSaving(true); setError(''); setMessage('');
        try {
            if (alertsCode.length !== 6) throw new Error('Ingresa el código completo.');
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ 
                    step: 'alerts', 
                    challengeId: alertsChallengeId, 
                    code: alertsCode,
                    notifyOnSuspicious: tempAlertSettings.notifyOnSuspicious,
                    alertDestination: tempAlertSettings.alertEmail
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo verificar el código de configuración.');

            setSettings((prev) => ({ 
                ...prev, 
                notifyOnSuspicious: tempAlertSettings.notifyOnSuspicious,
                alertEmail: tempAlertSettings.alertEmail
            }));
            resetAlertsFlow();
            setIsAlertsModalOpen(false);
            setMessage('Configuración de alertas actualizada exitosamente.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo actualizar la configuración.'));
        } finally {
            setSaving(false);
        }
    }

    async function sendDisableCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'disable' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo solicitar el código de desactivación.');

            setDisableChallengeId(json.challengeId);
            setDisableStep('sent');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo solicitar el código.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyDisableCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            if (disableCode.length !== 6) throw new Error('Ingresa el código completo.');
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'disable', challengeId: disableChallengeId, code: disableCode }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo verificar el código de desactivación.');

            setSettings((prev) => ({ ...prev, twoFactorEnabled: false, alertEmail: 'primary' }));
            resetDisableFlow();
            setIsDisableModalOpen(false);
            setMessage('Doble verificación desactivada exitosamente.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo desactivar el 2FA.'));
        } finally {
            setSaving(false);
        }
    }

    async function sendCurrentEmailCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            if (!newTwoFactorEmail.includes('@')) throw new Error('Ingresa el nuevo correo de doble acceso.');
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'current', email: newTwoFactorEmail }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo enviar el codigo.');

            setCurrentChallengeId(json.challengeId);
            setMaskedCurrentEmail(json.maskedEmail);
            setChangeStep('current_sent');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo enviar el codigo.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyCurrentEmailCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            if (!currentChallengeId) throw new Error('Primero solicita el codigo al correo actual.');
            if (currentCode.length !== 6) throw new Error('Ingresa el codigo completo.');

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'current', challengeId: currentChallengeId, code: currentCode }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo validar el correo actual.');

            setChangeStep('current_verified');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo validar el codigo.'));
        } finally {
            setSaving(false);
        }
    }

    async function sendNewEmailCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            if (!newTwoFactorEmail.includes('@')) throw new Error('Ingresa el nuevo correo de doble acceso.');
            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'new', email: newTwoFactorEmail, currentChallengeId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo enviar el codigo al nuevo correo.');

            setNewEmailChallengeId(json.challengeId);
            setMaskedNewEmail(json.maskedEmail || newTwoFactorEmail);
            setChangeStep('new_sent');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo enviar el codigo al nuevo correo.'));
        } finally {
            setSaving(false);
        }
    }

    async function verifyNewEmailCode() {
        setSaving(true); setError(''); setMessage('');
        try {
            if (!newEmailChallengeId) throw new Error('Primero solicita el codigo al nuevo correo.');
            if (newEmailCode.length !== 6) throw new Error('Ingresa el codigo completo.');

            const accessToken = await getAccessToken();
            const res = await fetch('/api/security/settings/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ step: 'new', challengeId: newEmailChallengeId, currentChallengeId, code: newEmailCode }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo verificar el nuevo correo.');

            setSettings((prev) => ({
                ...prev,
                twoFactorEmail: json.twoFactorEmail,
                maskedTwoFactorEmail: json.twoFactorEmail,
                twoFactorEnabled: true,
            }));
            setNewTwoFactorEmail('');
            resetEmailChangeFlow();
            setIsChangeModalOpen(false);
            setMessage('Correo de doble acceso activado y actualizado exitosamente.');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'No se pudo verificar el nuevo correo.'));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <LoaderCircle className="animate-spin" size={20} />
                    Obteniendo seguridad...
                </div>
            </div>
        );
    }

    // Determine current alert email value
    const currentAlertValue = ['primary', '2fa', 'both'].includes(settings.alertEmail) ? settings.alertEmail : 'primary';

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-primary">Configuración</p>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-2">Seguridad de Acceso</h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                        Supervisa y controla los métodos de acceso y notificaciones para proteger tu cuenta de administración.
                    </p>
                </div>
            </div>

            {(message || error) && (
                <div className={`rounded-2xl border px-5 py-4 text-sm flex items-center justify-between font-medium shadow-sm transition-all ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <span>{error || message}</span>
                    <button onClick={() => { setError(''); setMessage(''); }} className="opacity-70 hover:opacity-100 transition-opacity">
                        <X size={18}/>
                    </button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-3 items-stretch">
                {/* Card 1: Acceso Regional */}
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                        <Shield size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Región de Acceso</h2>
                    <p className="text-sm text-gray-500 mt-2 flex-grow leading-relaxed">
                        El acceso al sistema está estrictamente limitado geográficamente por motivos de seguridad institucional.
                    </p>
                    <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">Solo {settings.allowedCountries.join(', ')}</span>
                        <CheckCircle2 size={18} className="text-emerald-500"/>
                    </div>
                </div>

                {/* Card 2: Alertas de Seguridad */}
                <div className={`bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col transition-opacity ${!settings.twoFactorEnabled ? 'opacity-70 grayscale-[0.2]' : ''}`}>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-5">
                        <Bell size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Alertas de Intrusión</h2>
                    <p className="text-sm text-gray-500 mt-2 flex-grow leading-relaxed">
                        {!settings.twoFactorEnabled 
                            ? "Activa el 2FA primero para poder administrar las alertas de seguridad de forma protegida."
                            : "Recibirás notificaciones inmediatas si detectamos intentos de inicio de sesión sospechosos."}
                    </p>
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                            <span className="text-sm font-bold text-gray-700">Notificar alertas</span>
                            <label className={`relative inline-flex items-center ${!settings.twoFactorEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.notifyOnSuspicious}
                                    onChange={(e) => handleAlertChange({ notifyOnSuspicious: e.target.checked, alertEmail: currentAlertValue })}
                                    disabled={saving || !settings.twoFactorEnabled}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                        </div>
                        
                        {settings.notifyOnSuspicious && (
                            <select
                                value={currentAlertValue}
                                onChange={(e) => handleAlertChange({ notifyOnSuspicious: settings.notifyOnSuspicious, alertEmail: e.target.value })}
                                disabled={saving || !settings.twoFactorEnabled}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-brand-primary focus:border-brand-primary block px-3 py-2.5 outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50"
                            >
                                <option value="primary">Enviar al Correo Principal</option>
                                <option value="2fa">Enviar al Correo 2FA</option>
                                <option value="both">Enviar a Ambos Correos</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Card 3: 2FA */}
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors ${settings.twoFactorEnabled ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-500'}`}>
                        {settings.twoFactorEnabled ? <ShieldCheck size={24} /> : <LockKeyhole size={24} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Doble Verificación</h2>
                    <p className="text-sm text-gray-500 mt-2 flex-grow leading-relaxed">
                        {settings.twoFactorEnabled 
                            ? `Protección activa. Códigos vinculados a ${settings.maskedTwoFactorEmail || 'tu correo 2FA'}.`
                            : `Protección inactiva. Respaldo actual en ${profile?.email || 'tu correo principal'}.`}
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                        <button 
                            onClick={() => setIsChangeModalOpen(true)}
                            className="w-full rounded-xl bg-gray-900 text-white font-bold px-4 py-3 text-sm hover:bg-gray-800 transition-colors"
                        >
                            {settings.twoFactorEnabled ? 'Cambiar Correo 2FA' : 'Configurar 2FA'}
                        </button>
                        {settings.twoFactorEnabled && (
                            <button 
                                onClick={() => setIsDisableModalOpen(true)}
                                className="w-full rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold px-4 py-3 text-sm hover:bg-red-100 transition-colors"
                            >
                                Desactivar 2FA
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Cambiar/Configurar Correo 2FA */}
            {isChangeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="font-black text-gray-900 text-lg">Configuración de Seguridad</h3>
                            <button onClick={() => setIsChangeModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {changeStep === 'idle' && (
                                <div className="space-y-5">
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        Ingresa la nueva dirección de correo electrónico que utilizarás para recibir tus códigos de acceso de 6 dígitos.
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nuevo Correo 2FA</label>
                                        <input
                                            type="email"
                                            value={newTwoFactorEmail}
                                            onChange={(e) => setNewTwoFactorEmail(e.target.value)}
                                            placeholder="nombre@correo.com"
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-gray-50/50"
                                        />
                                    </div>
                                    <button
                                        onClick={sendCurrentEmailCode}
                                        disabled={saving || !newTwoFactorEmail}
                                        className="w-full rounded-2xl bg-brand-primary text-white font-bold px-4 py-4 disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
                                    >
                                        {saving ? <LoaderCircle className="animate-spin" size={18}/> : 'Continuar'}
                                        {!saving && <ArrowRight size={18}/>}
                                    </button>
                                </div>
                            )}

                            {changeStep === 'current_sent' && (
                                <div className="space-y-5">
                                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                                        <Mail size={28}/>
                                    </div>
                                    <p className="text-sm text-center text-gray-500 leading-relaxed">
                                        Por seguridad, hemos enviado un código de autorización a <strong className="text-gray-900">{maskedCurrentEmail || 'tu correo actual'}</strong>.
                                    </p>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={currentCode}
                                        onChange={(e) => setCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-5 text-center text-3xl font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-gray-50"
                                    />
                                    <button
                                        onClick={verifyCurrentEmailCode}
                                        disabled={saving || currentCode.length !== 6}
                                        className="w-full rounded-2xl bg-gray-900 text-white font-bold px-4 py-4 disabled:opacity-50 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                                    >
                                        {saving ? 'Verificando...' : 'Verificar Código'}
                                    </button>
                                </div>
                            )}

                            {(changeStep === 'current_verified' || changeStep === 'new_sent') && (
                                <div className="space-y-5">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                                        <ShieldCheck size={28}/>
                                    </div>
                                    <p className="text-sm text-center text-gray-500 leading-relaxed">
                                        {changeStep === 'current_verified' 
                                            ? `Autorización verificada. Haz clic en continuar para enviar el código de confirmación final a la nueva dirección.` 
                                            : `Enviamos el código final a la nueva dirección: `}
                                        {changeStep === 'new_sent' && <strong className="text-gray-900 block mt-1">{maskedNewEmail || newTwoFactorEmail}</strong>}
                                    </p>
                                    
                                    {changeStep === 'new_sent' && (
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={newEmailCode}
                                            onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-5 text-center text-3xl font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-gray-50 animate-in slide-in-from-bottom-2"
                                        />
                                    )}

                                    {changeStep === 'current_verified' ? (
                                        <button
                                            onClick={sendNewEmailCode}
                                            disabled={saving}
                                            className="w-full rounded-2xl bg-brand-primary text-white font-bold px-4 py-4 disabled:opacity-50 hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 flex justify-center items-center gap-2"
                                        >
                                            {saving ? 'Enviando...' : 'Enviar Código Final'}
                                            {!saving && <ArrowRight size={18}/>}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={verifyNewEmailCode}
                                            disabled={saving || newEmailCode.length !== 6}
                                            className="w-full rounded-2xl bg-gray-900 text-white font-bold px-4 py-4 disabled:opacity-50 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                                        >
                                            {saving ? 'Confirmando...' : 'Confirmar y Activar 2FA'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Alertas de Intrusión */}
            {isAlertsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-amber-50/50">
                            <h3 className="font-black text-amber-700 text-lg flex items-center gap-2">
                                <Bell size={20}/>
                                Permisos de Alerta
                            </h3>
                            <button onClick={() => { setIsAlertsModalOpen(false); resetAlertsFlow(); }} className="text-amber-500 hover:text-amber-700 bg-amber-100/50 hover:bg-amber-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {alertsStep === 'idle' ? (
                                <div className="space-y-5">
                                    <p className="text-sm text-gray-500 leading-relaxed text-center">
                                        Estás intentando modificar a dónde se envían tus alertas de seguridad (o apagarlas). Para proteger tu cuenta, requerimos autorización 2FA.
                                    </p>
                                    <button
                                        onClick={sendAlertsCode}
                                        disabled={saving}
                                        className="w-full rounded-2xl bg-amber-500 text-white font-bold px-4 py-4 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
                                    >
                                        {saving ? 'Generando...' : 'Solicitar Código de Autorización'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <p className="text-sm text-center text-gray-500 leading-relaxed">
                                        Hemos enviado el código de autorización a <strong className="text-gray-900 block mt-1">{settings.maskedTwoFactorEmail || 'tu correo'}</strong>.
                                    </p>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={alertsCode}
                                        onChange={(e) => setAlertsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full rounded-2xl border border-amber-200 px-4 py-5 text-center text-3xl font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/50 text-amber-900"
                                    />
                                    <button
                                        onClick={verifyAlertsCode}
                                        disabled={saving || alertsCode.length !== 6}
                                        className="w-full rounded-2xl bg-amber-500 text-white font-bold px-4 py-4 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
                                    >
                                        {saving ? 'Aplicando cambios...' : 'Autorizar y Guardar Cambios'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Desactivar 2FA */}
            {isDisableModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-red-50/30">
                            <h3 className="font-black text-red-600 text-lg flex items-center gap-2">
                                <ShieldAlert size={20}/>
                                Desactivar 2FA
                            </h3>
                            <button onClick={() => { setIsDisableModalOpen(false); resetDisableFlow(); }} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {disableStep === 'idle' ? (
                                <div className="space-y-5">
                                    <p className="text-sm text-gray-500 leading-relaxed text-center">
                                        Para desactivar la doble verificación y exponer tu cuenta a un inicio de sesión de un solo factor, necesitamos validar que eres tú.
                                    </p>
                                    <button
                                        onClick={sendDisableCode}
                                        disabled={saving}
                                        className="w-full rounded-2xl bg-red-600 text-white font-bold px-4 py-4 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        {saving ? 'Generando...' : 'Solicitar Código de Desactivación'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <p className="text-sm text-center text-gray-500 leading-relaxed">
                                        Hemos enviado el código de desactivación a <strong className="text-gray-900 block mt-1">{settings.maskedTwoFactorEmail || 'tu correo'}</strong>.
                                    </p>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={disableCode}
                                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full rounded-2xl border border-red-200 px-4 py-5 text-center text-3xl font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50 text-red-900"
                                    />
                                    <button
                                        onClick={verifyDisableCode}
                                        disabled={saving || disableCode.length !== 6}
                                        className="w-full rounded-2xl bg-red-600 text-white font-bold px-4 py-4 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        {saving ? 'Desactivando...' : 'Confirmar Desactivación'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
