"use client";

import React, { useState } from 'react';
import {
    Users,
    LoaderCircle,
    Pencil,
    ArrowLeft,
    Save,
    BrainCircuit,
    BookOpen,
    Sparkles,
    Upload,
    FileText,
    X,
    CheckCircle2,
    Camera,
    MinusCircle,
    Send,
    MessageSquare,
    RotateCcw,
    Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useConversation } from '@elevenlabs/react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const DEFAULT_SYSTEM_PROMPT = `PERSONALIDAD
Tu nombre es [NOMBRE_DEL_AGENTE], eres un asesor virtual de la empresa [NOMBRE_DE_LA_EMPRESA]. Tu función es orientar, filtrar y calificar a las personas que escriben por WhatsApp solicitando información sobre los servicios, trámites o soluciones que ofrece la empresa. Te comunicas únicamente por mensajes de texto.
Eres claro, eficiente y profesional, con un tono amigable, cercano y seguro. Hablas siempre por el nombre de la persona; si no lo tienes, lo solicitas de forma natural sin mencionar que es para personalizar la conversación. No utilices la palabra “usted”. Desde el primer mensaje debes generar confianza.

CONTEXTO
Interactúas con personas que llegan desde anuncios, redes sociales, formularios u otros canales digitales. Algunos tienen una necesidad real y desean iniciar un proceso, otros solo tienen dudas puntuales y otros están explorando información general. Parte de tu trabajo es identificar rápidamente quién realmente tiene interés y quién no. Muchos estarán dispuestos a pagar por un servicio profesional si entienden bien el proceso y el valor que se les ofrece.

TONO DE COMUNICACIÓN
Tu comunicación debe ser profesional, clara y cercana, sin ser invasiva. No prometas resultados ni aprobaciones. Utiliza un lenguaje sencillo, sin tecnicismos. Evita mensajes largos; sé breve y directo, fomentando siempre el diálogo y la interacción, ya que los textos extensos no se leen.

OBJETIVO
Tu objetivo principal es calificar leads y no perder tiempo en conversaciones sin intención real. Debes identificar en pocas interacciones si la persona tiene una necesidad concreta, si su caso requiere atención especializada y si estaría dispuesta a pagar por un servicio profesional.
Idealmente, en un máximo de cuatro preguntas ya deberías tener claro si el contacto es un lead potencial o no. Si la persona se va por las ramas, redirige la conversación. Si esquiva responder temas clave, asume bajo interés y cierra de forma cordial.

FLUJO DE CONVERSACIÓN
Inicia la conversación saludando y explicando brevemente el motivo del contacto. Luego pregunta de forma directa qué servicio, trámite o solución está buscando.
Si solo solicita información general, brinda una explicación básica, clara y breve, sin profundizar demasiado. Si el caso es específico o notas interés real, motívalo a iniciar un proceso o a que su caso sea evaluado.
Cuando el caso requiera análisis, sea complejo o no tengas información suficiente, propón derivarlo con un asesor o especialista humano.

FILTRO ECONÓMICO
Antes de derivar a un asesor, aclara siempre que la gestión o el servicio tiene un costo, pero que hablar, evaluar o comentar su situación no tiene ningún costo. El pago solo aplica si la persona decide iniciar el proceso o contratar el servicio. Pregunta de forma clara si está dispuesto a continuar bajo esas condiciones.

DECISIÓN Y CIERRE
Si acepta continuar, solicita únicamente su nombre y un apellido, e indícale que un asesor especializado lo contactará por este mismo número de WhatsApp.
Si no acepta, desea verlo más adelante o no muestra interés real, brinda información general de cierre y despídete cordialmente sin intentar prolongar la conversación.

REGLAS IMPORTANTES
No brindes asesoría técnica o especializada.
No prometas resultados ni garantías.
No des opiniones profesionales definitivas.
Si mencionas montos, escríbelos en número y en texto (por ejemplo: S/ 300 – trescientos soles).
Aclara siempre que hablar con un asesor no tiene costo y que el pago solo aplica si inicia el proceso.
No envíes textos largos ni satures de información.
Promueve el diálogo y enfócate en calificar correctamente al lead.

CASOS ESPECIALES
Si el usuario indica ser cliente antiguo, tiene una queja o solicita hablar directamente con un asesor, pídele su nombre y el motivo del contacto, registra la solicitud y confirma que será contactado a la brevedad.`;

export default function AgentConfigPage() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const searchParams = useSearchParams();
    const agentId = searchParams.get('id');

    const [activeTab, setActiveTab] = useState<'behavior' | 'knowledge' | 'channels'>('behavior');
    const [files, setFiles] = useState<{ name: string, size: string }[]>([]);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAgentLoading, setIsAgentLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Form States
    const [nombre, setNombre] = useState('');
    const [personalidad, setPersonalidad] = useState('Asesor de ventas / Asistente Comercial');
    const [systemPrompt, setSystemPrompt] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [syncedNumbers, setSyncedNumbers] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [elevenLabsAgentId, setElevenLabsAgentId] = useState('');
    const [associatedPhone, setAssociatedPhone] = useState<string | null>(null);
    const [associatedPhoneId, setAssociatedPhoneId] = useState<string | null>(null);
    const [showTestChat, setShowTestChat] = useState(false);
    const [isEditingNombre, setIsEditingNombre] = useState(false);
    const [isEditingPersonalidad, setIsEditingPersonalidad] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<number | null>(null);
    const [showDeleteNumberModal, setShowDeleteNumberModal] = useState(false);
    const [infoModal, setInfoModal] = useState<{ isOpen: boolean, type: 'success' | 'error', message: string }>({ isOpen: false, type: 'success', message: '' });

    // Impersonation State
    const viewAsUid = searchParams.get('view_as');
    const isAdmin = profile?.role === 'admin';
    const targetUid = (isAdmin && viewAsUid) ? viewAsUid : user?.id;

    // Chat State
    // Chat State with SDK
    const conversation = useConversation({
        // Enable text-only mode to avoid requesting microphone permissions
        // This is crucial for a text chat interface where users might not want/have audio input enabled.
        // It prevents the "NotAllowedError: Permission dismissed" when starting the session.
        textOnly: true,
        onMessage: (message) => {
            if (message.source === 'ai') {
                // Determine if this is a new message or an update to the last one
                setIsAgentTyping(false); // Agent started speaking/typing
                setChatMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'agent' && lastMsg.isStreaming) {
                        // Check if the message is complete (you might need more robust logic here depending on SDK)
                        // For now, we'll just append. Real streaming logic might be different.
                        // But usually 'message' event from SDK gives full chunks or complete sentences.
                        // Let's assume message.message is the text chunk.
                        return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + " " + message.message }];
                    }
                    return [...prev, { role: 'agent', text: message.message }];
                });
            }
        },
        onError: (error) => {
            console.error('Conversation error:', error);
            setChatMessages(prev => [...prev, { role: 'agent', text: 'Error de conexión.' }]);
        },
        onConnect: () => {
            console.log('Connected to ElevenLabs');
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
        }
    });

    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'agent'; text: string; isStreaming?: boolean }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    // Load Data
    React.useEffect(() => {
        if (!user || !targetUid) return;

        async function loadAgent() {
            if (!agentId) {
                setIsAgentLoading(false);
                return;
            }
            setIsAgentLoading(true);

            let data, error;
            const isImpersonating = isAdmin && viewAsUid;
            const isTenantOwner = profile?.role === 'tenant_owner';

            if (isImpersonating) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch(`/api/admin/impersonate/agents?user_id=${targetUid}`, {
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        // Find the specific agent
                        data = json.agents.find((a: { id: string }) => a.id === agentId);
                    } else {
                        const errJson = await res.json();
                        error = errJson.error;
                    }
                } catch (e: unknown) {
                    error = e instanceof Error ? e.message : String(e);
                }
            } else if (isTenantOwner) {
                // Tenant owners use server-side API to bypass RLS for shared/global agents
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch(`/api/agents/fetch?id=${agentId}`, {
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        data = json.agent;
                    } else {
                        const errJson = await res.json();
                        error = errJson.error;
                    }
                } catch (e: unknown) {
                    error = e instanceof Error ? e.message : String(e);
                }
            } else {
                const result = await supabase
                    .from('agentes')
                    .select('*')
                    .eq('id', agentId)
                    .single();
                data = result.data;
                error = result.error;
            }

            if (data && !error) {
                setNombre(data.nombre || '');
                setPersonalidad(data.personalidad || 'Profesional y Directo');
                setSystemPrompt(data.prompt || DEFAULT_SYSTEM_PROMPT);
                setAvatarPreview(data.avatar_url || null);
                setElevenLabsAgentId(data.eleven_labs_agent_id || '');
                setAssociatedPhone(data.phone_number || null);
                setAssociatedPhoneId(data.phone_number_id || null);

                // Load persisted knowledge files
                if (data.knowledge_files && Array.isArray(data.knowledge_files)) {
                    setFiles(data.knowledge_files);
                }
            } else if (error) {
                console.error('Error loading agent:', error);
            }
            setIsAgentLoading(false);
        }

        loadAgent();
    }, [user, profile, agentId, targetUid, isAdmin, viewAsUid]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);

        try {
            const agentData = {
                nombre,
                personalidad,
                prompt: systemPrompt,
                avatar_url: avatarPreview,
                eleven_labs_agent_id: elevenLabsAgentId,
                phone_number: associatedPhone,
                phone_number_id: associatedPhoneId,
                knowledge_files: files,
                user_id: user.id
            };

            let error;
            // Variable to store the ID if we create one
            let newElevenLabsId = elevenLabsAgentId;

            // 1. If we don't have an ElevenLabs ID, create it first
            if (!newElevenLabsId && nombre) {
                console.log('Attempting to create agent in ElevenLabs...');
                try {
                    const createRes = await fetch('/api/elevenlabs/agents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: nombre,
                            prompt: systemPrompt
                        })
                    });

                    if (createRes.ok) {
                        const createData = await createRes.json();
                        console.log('ElevenLabs creation response:', createData);
                        if (createData.agent_id) {
                            newElevenLabsId = createData.agent_id;
                            setElevenLabsAgentId(newElevenLabsId);
                            // Update agentData with the new ID
                            agentData.eleven_labs_agent_id = newElevenLabsId;

                            // Show a toast or log success
                            console.log('Created new ElevenLabs Agent:', newElevenLabsId);
                        } else {
                            console.error('No agent_id in creation response:', createData);
                        }
                    } else {
                        const errorData = await createRes.json();
                        console.error('Failed to create agent in ElevenLabs:', createRes.status, errorData);
                        setInfoModal({
                            isOpen: true,
                            type: 'error',
                            message: `Error al crear agente en ElevenLabs: ${errorData.error || errorData.detail || 'Error desconocido'}`
                        });
                        // Stop execution to prevent saving a broken state
                        setIsSaving(false);
                        return;
                    }
                } catch (creationError) {
                    console.error('Error creating agent in ElevenLabs:', creationError);
                    setInfoModal({
                        isOpen: true,
                        type: 'error',
                        message: `Error de conexión con ElevenLabs: ${creationError instanceof Error ? creationError.message : String(creationError)}`
                    });
                    setIsSaving(false);
                    return;
                }
            } else {
                console.log('Skipping creation:', { newElevenLabsId, nombre });
            }

            if (agentId && agentId !== '1' && agentId !== '2') {
                // Update existing agent
                const isImpersonating = isAdmin && viewAsUid;
                const isTenantOwner = profile?.role === 'tenant_owner';
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { user_id, ...updateData } = agentData;

                if (isImpersonating) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/admin/impersonate/mutate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({
                            action: 'SAVE_AGENT_CONFIG',
                            targetUid,
                            agentId,
                            data: updateData
                        })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Server error');
                    }
                } else if (isTenantOwner) {
                    // Tenant owners use server-side API to bypass RLS for shared/global agents
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/agents/save-general', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ agentId, data: updateData })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Server error');
                    }
                } else {
                    const { error: updateError } = await supabase
                        .from('agentes')
                        .update(updateData)
                        .eq('id', agentId);
                    error = updateError;
                }
            } else {
                // Insert new agent
                const { error: insertError } = await supabase
                    .from('agentes')
                    .insert([agentData]);
                error = insertError;
            }

            if (error) throw error;

            // Sync to ElevenLabs if we have an agent ID
            if (elevenLabsAgentId) {
                try {
                    await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: nombre,
                            conversation_config: {
                                agent: {
                                    prompt: {
                                        prompt: systemPrompt
                                    }
                                }
                            }
                        })
                    });
                } catch (syncError) {
                    console.error('Error syncing to ElevenLabs:', syncError);
                }
            }

            setHasUnsavedChanges(false);
            setInfoModal({ isOpen: true, type: 'success', message: '¡Configuración guardada y sincronizada correctamente!' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error saving agent:', error);
            setInfoModal({ isOpen: true, type: 'error', message: `Error al guardar los cambios: ${error.message || JSON.stringify(error)}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const rawFiles = Array.from(e.target.files);
        const newFiles = rawFiles.map(f => ({
            name: f.name,
            size: f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : (f.size / 1024).toFixed(1) + ' KB'
        }));
        setFiles(prev => [...prev, ...newFiles]);
        setHasUnsavedChanges(true);

        // Sync to ElevenLabs if we have an agent ID
        if (elevenLabsAgentId) {
            for (const file of rawFiles) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}/knowledge`, {
                        method: 'POST',
                        body: formData,
                    });
                } catch (err) {
                    console.error('Error uploading file to ElevenLabs:', err);
                }
            }
        }

        // Reset input so the same file can be re-uploaded
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFileToDelete(index);
    };

    const confirmRemoveFile = async () => {
        if (fileToDelete === null) return;
        const fileToRemove = files[fileToDelete];
        setFiles(files.filter((_, i) => i !== fileToDelete));
        setHasUnsavedChanges(true);
        setFileToDelete(null);

        // Sync deletion to ElevenLabs - remove from KB via PATCH
        if (elevenLabsAgentId && fileToRemove) {
            try {
                // We fetch current agent detail to find the KB doc ID
                const detailRes = await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}`);
                if (detailRes.ok) {
                    const detail = await detailRes.json();
                    const kb = detail.conversation_config?.agent?.prompt?.knowledge_base || [];
                    const matchingDoc = kb.find((doc: { name?: string; file_name?: string; id?: string }) => doc.name === fileToRemove.name || doc.file_name === fileToRemove.name);
                    if (matchingDoc && matchingDoc.id) {
                        // Remove the doc from KB by patching the agent with the doc removed
                        const updatedKb = kb
                            .filter((doc: { id: string }) => doc.id !== matchingDoc.id)
                            .map((doc: { type?: string; id: string; name?: string; usage_mode?: string }) => ({ type: doc.type || 'file', id: doc.id, name: doc.name || 'documento', usage_mode: doc.usage_mode || 'auto' }));
                        await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                conversation_config: {
                                    agent: {
                                        prompt: {
                                            knowledge_base: updatedKb
                                        }
                                    }
                                }
                            })
                        });
                    }
                }
            } catch (err) {
                console.error('Error removing file from ElevenLabs KB:', err);
            }
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
                setHasUnsavedChanges(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImportFromMeta = () => {
        // Center of screen popup
        const width = 1000;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const url = 'https://elevenlabs.io/app/conversational-ai/whatsapp';
        window.open(
            url,
            'ElevenLabsWhatsApp',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
        );

        setInfoModal({ isOpen: true, type: 'success', message: 'Se ha abierto la ventana de ElevenLabs. Sigue los pasos para vincular tu número.' });
    };

    const handleSyncNumbers = async (silent = false) => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/elevenlabs/numbers');
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al sincronizar números');
            }
            const data = await response.json();
            const numbers = data.phone_numbers || [];
            setSyncedNumbers(numbers);

            if (!silent) {
                setInfoModal({ isOpen: true, type: 'success', message: 'Números sincronizados correctamente' });
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(error);
            if (!silent) {
                setInfoModal({ isOpen: true, type: 'error', message: "Error: " + error.message });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteNumber = () => {
        setShowDeleteNumberModal(true);
    };

    const confirmDeleteNumber = async () => {
        setShowDeleteNumberModal(false);

        if (!associatedPhoneId) {
            setAssociatedPhone(null);
            setHasUnsavedChanges(true);
            return;
        }

        setIsSaving(true);
        try {
            // Only unlink from our panel, don't delete from ElevenLabs
            setAssociatedPhone(null);
            setAssociatedPhoneId(null);
            setHasUnsavedChanges(true);
            setInfoModal({ isOpen: true, type: 'success', message: 'Número desvinculado correctamente. Recuerda guardar los cambios.' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(error);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };


    // Auto-scroll chat to bottom
    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const sendChatMessage = async () => {
        const trimmed = chatInput.trim();
        if (!trimmed || !elevenLabsAgentId) return;

        setChatMessages(prev => [...prev, { role: 'user', text: trimmed }]);
        setChatInput('');

        try {
            // If not connected, we need to connect first
            if (conversation.status !== 'connected') {
                // 1. Get Signed URL
                const response = await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}/signed-url`);
                if (!response.ok) throw new Error('Failed to get signed URL');
                const { signedUrl } = await response.json();

                // 2. Start Session with Signed URL
                await conversation.startSession({
                    signedUrl,
                    // textOnly: true // Enable this if you want strictly text, but SDK might default to voice if not set.
                    // Actually, for pure text chat via this SDK, we just use sendUserMessage.
                    // The SDK is primarily for voice, but let's see if we can perform text-only.
                    // If the user wants just text bubbles, we can mute the input/output?
                    // Or simply use the conversation purely for text.
                });
            }

            // 3. Send Message
            // Use sendUserMessage for text input
            // Just assume `sendUserMessage` is safer if `sendText` fails type check.
            const conv = conversation as unknown as { sendText?: (t: string) => Promise<void>; sendUserMessage: (t: string) => Promise<void> };
            if (typeof conv.sendText === 'function') {
                await conv.sendText(trimmed);
            } else {
                // Fallback for newer SDK versions
                await conv.sendUserMessage(trimmed);
            }
            setIsAgentTyping(true);

        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev, { role: 'agent', text: 'Error al conectar con el agente.' }]);
            setIsAgentTyping(false);
        }
    };

    const resetChat = async () => {
        await conversation.endSession();
        setChatMessages([]);
        setChatInput('');
        setIsAgentTyping(false);
    };

    // Auto-sync when returning to the app
    React.useEffect(() => {
        const handleFocus = () => {
            if (activeTab === 'channels') {
                handleSyncNumbers(true);
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [activeTab]);


    return (
        <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-6 pt-4">
            {/* Navigation Header */}
            <div className="flex items-center">
                <Link href={`/leads/app/dashboard${viewAsUid ? `?view_as=${viewAsUid}` : ''}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-medium uppercase tracking-widest">Volver</span>
                </Link>
            </div>

            <div className="flex items-end justify-between border-b border-gray-100 pb-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Agente</h2>
                    <p className="text-gray-500 text-xs">Define la personalidad, el conocimiento y los canales de tu experto en IA.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('behavior')}
                    className={`px-8 py-4 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'behavior'
                        ? 'border-brand-turquoise text-brand-turquoise'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <BrainCircuit size={18} />
                    1. Comportamiento
                </button>
                <button
                    onClick={() => setActiveTab('knowledge')}
                    className={`px-8 py-4 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'knowledge'
                        ? 'border-brand-turquoise text-brand-turquoise'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <BookOpen size={18} />
                    2. Conocimiento
                </button>
                <button
                    onClick={() => setActiveTab('channels')}
                    className={`px-8 py-4 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'channels'
                        ? 'border-brand-turquoise text-brand-turquoise'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Users size={18} />
                    3. Número WhatsApp
                </button>
            </div>

            {/* Loading State */}
            {isAgentLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">Cargando configuración...</p>
                    <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-turquoise rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
                    </div>
                    <style jsx>{`
                        @keyframes loading-bar {
                            0% { width: 0%; margin-left: 0%; }
                            50% { width: 60%; margin-left: 20%; }
                            100% { width: 0%; margin-left: 100%; }
                        }
                    `}</style>
                </div>
            )}

            {/* Tab Content */}
            {!isAgentLoading && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Main Content Area */}
                <div className="lg:col-span-2 flex flex-col">
                    {activeTab === 'behavior' && (
                        <div className="card-professional p-8 flex flex-col gap-6 animate-in fade-in duration-500 h-full">



                            {/* Avatar Section */}
                            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-brand-primary transition-colors">
                                        {avatarPreview ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={28} className="text-gray-400 group-hover:text-brand-primary" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        id="avatar-upload"
                                    />
                                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">Cambiar</span>
                                    </label>
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 group/name">
                                        {isEditingNombre ? (
                                            <input
                                                type="text"
                                                value={nombre}
                                                onChange={(e) => { setNombre(e.target.value); setHasUnsavedChanges(true); }}
                                                onBlur={() => setIsEditingNombre(false)}
                                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingNombre(false)}
                                                autoFocus
                                                className="text-xl font-bold text-gray-900 bg-gray-50 border-b border-brand-primary outline-none px-1 py-0.5 w-full max-w-xs"
                                            />
                                        ) : (
                                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                {nombre || 'Nombre del Agente'}
                                                <button
                                                    onClick={() => setIsEditingNombre(true)}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-brand-primary transition-all opacity-0 group-hover/name:opacity-100"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </h3>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 group/desc">
                                        {isEditingPersonalidad ? (
                                            <input
                                                type="text"
                                                value={personalidad}
                                                onChange={(e) => { setPersonalidad(e.target.value); setHasUnsavedChanges(true); }}
                                                onBlur={() => setIsEditingPersonalidad(false)}
                                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingPersonalidad(false)}
                                                autoFocus
                                                className="text-xs text-gray-500 bg-gray-50 border-b border-brand-primary outline-none px-1 py-0.5 w-full max-w-xs font-bold uppercase tracking-widest"
                                            />
                                        ) : (
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                {personalidad || 'Define su función'}
                                                <button
                                                    onClick={() => setIsEditingPersonalidad(true)}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-brand-primary transition-all opacity-0 group-hover/desc:opacity-100"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-0 flex-1 flex flex-col">
                                <div className="space-y-3 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest opacity-70">
                                            <FileText size={16} className="text-brand-primary" />
                                            Comportamiento del Agente (System Prompt)
                                        </label>
                                    </div>
                                    <div className="relative flex-1 min-h-[300px]">
                                        <textarea
                                            value={systemPrompt}
                                            onChange={(e) => { setSystemPrompt(e.target.value); setHasUnsavedChanges(true); }}
                                            placeholder=""
                                            className="w-full h-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary outline-none resize-none leading-relaxed text-sm shadow-inner"
                                        />
                                        <button
                                            onClick={() => setIsPromptModalOpen(true)}
                                            className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl text-brand-primary shadow-sm hover:scale-110 transition-all hover:bg-brand-primary hover:text-white group"
                                            title="Editar en pantalla completa"
                                        >
                                            <Pencil size={20} className="transition-transform group-hover:rotate-12" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'knowledge' && (
                        <div className="card-professional p-8 space-y-8 animate-in fade-in duration-500 h-full">
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 hover:border-brand-turquoise/50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-brand-turquoise/5 flex items-center justify-center text-brand-turquoise">
                                        <Upload size={20} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-400 text-xs">Sube preguntas frecuentes, detalle de servicios, catálogos de precios o cualquier documento útil para tu agente.</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">PDF, DOCX, TXT (Max 10MB por archivo)</p>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="file-upload"
                                        accept=".pdf,.docx,.doc,.txt,.csv,.xlsx"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer px-5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Seleccionar Archivos
                                    </label>
                                </div>

                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Archivos Subidos ({files.length})</h4>
                                        <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                                            {files.map((file, i) => (
                                                <div key={i} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FileText size={14} className="text-brand-turquoise shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-gray-900 truncate max-w-[180px]">{file.name}</p>
                                                            <p className="text-[9px] text-gray-400">{file.size}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(i)}
                                                        className="p-0.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors shrink-0"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'channels' && (
                        <div className="card-professional p-8 space-y-8 animate-in fade-in duration-500 h-full">
                            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                                    <Users size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-gray-900">Configuración de WhatsApp</h3>
                                    <p className="text-xs text-gray-500">Conecta tu agente a WhatsApp Business mediante Meta.</p>
                                </div>
                            </div>

                            <div className="space-y-8">

                                <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center space-y-6 bg-gray-50/50 min-h-[240px]">
                                    {associatedPhone ? (
                                        <div className="w-full max-w-sm">
                                            <div className="bg-white p-5 rounded-2xl border border-brand-turquoise/20 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-brand-turquoise/10 flex items-center justify-center text-brand-turquoise">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-bold text-gray-900">{associatedPhone}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-turquoise animate-pulse" />
                                                            <p className="text-[10px] text-brand-turquoise font-bold uppercase tracking-widest">En Línea</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleSyncNumbers()}
                                                        disabled={isSyncing}
                                                        className="p-2.5 hover:bg-brand-turquoise/10 text-brand-turquoise rounded-xl transition-all"
                                                        title="Refrescar conexión"
                                                    >
                                                        <LoaderCircle size={18} className={isSyncing ? "animate-spin" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteNumber}
                                                        className="p-2.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                                                        title="Desvincular WhatsApp"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-8 w-full max-w-sm">
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 bg-[#1877F2]/10 text-[#1877F2] rounded-3xl flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-300">
                                                    <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">Conecta tu WhatsApp</h4>
                                                    <p className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">Vincula tu número oficial de Meta para habilitar las llamadas de tu agente.</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleImportFromMeta}
                                                className="w-full py-4 bg-[#1877F2] text-white rounded-2xl text-[13px] font-bold hover:bg-[#166fe5] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
                                            >
                                                Vincular con Meta
                                            </button>

                                            <button
                                                onClick={() => handleSyncNumbers()}
                                                disabled={isSyncing}
                                                className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-brand-turquoise transition-colors flex items-center justify-center gap-2 mx-auto pt-2"
                                            >
                                                <LoaderCircle size={12} className={isSyncing ? "animate-spin" : ""} />
                                                <span>Si ya lo vinculaste, pulsa aquí para refrescar</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {syncedNumbers.length > 0 && !associatedPhone && (
                                    <div className="space-y-4 pt-4 border-t border-gray-50 animate-in fade-in duration-500">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Números detectados</p>
                                        <div className="grid gap-2 max-w-sm mx-auto">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {syncedNumbers.map((num: any) => (
                                                <button
                                                    key={num.phone_number_id}
                                                    onClick={async () => {
                                                        const confirmLink = confirm(`¿Quieres vincular el número ${num.phone_number} a este agente?`);
                                                        if (!confirmLink) return;

                                                        setIsSaving(true);
                                                        try {
                                                            // Link in ElevenLabs
                                                            if (elevenLabsAgentId) {
                                                                await fetch(`/api/elevenlabs/numbers/${num.phone_number_id}`, {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ agent_id: elevenLabsAgentId })
                                                                });
                                                            }

                                                            setAssociatedPhone(num.phone_number);
                                                            setAssociatedPhoneId(num.phone_number_id);
                                                            setHasUnsavedChanges(true);
                                                            alert("Número vinculado al agente correctamente.");
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert("Error al vincular el número en ElevenLabs.");
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}
                                                    className="p-4 bg-white border border-gray-100 rounded-2xl text-xs text-gray-700 hover:border-brand-turquoise/50 hover:bg-brand-turquoise/5 transition-all text-left flex items-center justify-between group shadow-sm"
                                                >
                                                    <span className="font-bold">{num.phone_number}</span>
                                                    <span className="text-[10px] text-brand-turquoise font-bold opacity-0 group-hover:opacity-100 transition-opacity">Vincular →</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info Area */}
                <div className="space-y-6">
                    {/* Action Buttons Location */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setShowTestChat(true)}
                            className="px-4 py-3 bg-[#25D366] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#128C7E] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-md shadow-green-500/20"
                            disabled={!elevenLabsAgentId}
                        >
                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Probar Chat
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 text-white",
                                hasUnsavedChanges
                                    ? "bg-amber-500 shadow-amber-500/20"
                                    : "bg-brand-primary shadow-brand-primary/20"
                            )}
                        >
                            {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                    <div className="card-professional p-6 bg-brand-turquoise/5 border-brand-turquoise/10">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Sparkles size={16} className="text-brand-turquoise" />
                            Tips de Configuración
                        </h4>
                        <ul className="space-y-4 text-xs text-gray-600 leading-relaxed">
                            <li>
                                <span className="font-bold block text-gray-900 mb-1">Comportamiento</span>
                                Define claramente el rol y el tono. Ejemplo: &quot;Eres un asistente amable y persuasivo de ventas.&quot;
                            </li>
                            <li>
                                <span className="font-bold block text-gray-900 mb-1">Conocimiento</span>
                                Sube PDFs con precios y preguntas frecuentes para que el agente tenga respuestas precisas.
                            </li>
                            <li>
                                <span className="font-bold block text-gray-900 mb-1">Número WhatsApp</span>
                                Vincula un número exclusivo para que tu agente pueda recibir y realizar llamadas 24/7.
                            </li>
                        </ul>
                    </div>

                    <div className="card-professional p-6 border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900 mb-4">Estado del Agente</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Nombre</span>
                                {nombre ? (
                                    <CheckCircle2 size={16} className="text-brand-turquoise" />
                                ) : (
                                    <div className="text-amber-500 rounded-full">
                                        <MinusCircle size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Comportamiento</span>
                                {systemPrompt ? (
                                    <CheckCircle2 size={16} className="text-brand-turquoise" />
                                ) : (
                                    <div className="text-amber-500 rounded-full">
                                        <MinusCircle size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Conocimiento</span>
                                {files.length > 0 ? (
                                    <CheckCircle2 size={16} className="text-brand-turquoise" />
                                ) : (
                                    <div className="text-amber-500 rounded-full">
                                        <MinusCircle size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Número WhatsApp</span>
                                {associatedPhone ? (
                                    <CheckCircle2 size={16} className="text-brand-turquoise" />
                                ) : (
                                    <div className="text-amber-500 rounded-full">
                                        <MinusCircle size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>}
            {/* Test Chat Modal */}
            {showTestChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[650px]">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-turquoise/20 to-brand-primary/10 flex items-center justify-center text-brand-turquoise">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Probar Agente</h3>
                                    <p className="text-[10px] text-gray-400">Chat de prueba en tiempo real</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={resetChat}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-brand-turquoise"
                                    title="Reiniciar conversación"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={() => { setShowTestChat(false); resetChat(); }}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/80 scrollbar-thin">
                            {chatMessages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-turquoise/10 flex items-center justify-center text-brand-turquoise">
                                        <Sparkles size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-gray-700">¡Hola! Soy {nombre || 'tu agente'}</p>
                                        <p className="text-xs text-gray-400 max-w-[260px]">Escribe un mensaje para probar las respuestas de tu agente en tiempo real.</p>
                                    </div>
                                </div>
                            )}
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={cn(
                                            'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                                            msg.role === 'user'
                                                ? 'bg-brand-primary text-white rounded-br-md'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                                        )}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isAgentTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}
                            {conversation.status === 'connecting' && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2">
                                        <LoaderCircle size={14} className="animate-spin text-brand-turquoise" />
                                        <span className="text-xs text-gray-400">Conectando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-turquoise/50 focus:border-brand-turquoise placeholder:text-gray-400"
                                    disabled={conversation.status === 'connecting'}
                                    autoFocus
                                />
                                <button
                                    onClick={sendChatMessage}
                                    disabled={!chatInput.trim() || conversation.status === 'connecting'}
                                    className="p-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Fullscreen Modal */}
            {isPromptModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[85vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Comportamiento del Agente</h3>
                                    <p className="text-xs text-gray-500">Edita el System Prompt en pantalla completa</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPromptModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 p-6 bg-gray-50">
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => { setSystemPrompt(e.target.value); setHasUnsavedChanges(true); }}
                                className="w-full h-full bg-white border border-gray-200 rounded-2xl p-8 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-none leading-relaxed text-[13px] text-gray-800 shadow-sm font-medium"
                                placeholder="Escribe aquí las instrucciones detalladas para el comportamiento de tu agente..."
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 flex items-center justify-end bg-white gap-3">
                            <span className="text-xs text-gray-400 italic">Los cambios en el prompt se guardan al cerrar. No olvides el botón principal de guardar.</span>
                            <button
                                onClick={() => setIsPromptModalOpen(false)}
                                className={cn(
                                    "px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 text-white",
                                    hasUnsavedChanges
                                        ? "bg-amber-500 shadow-amber-500/20"
                                        : "bg-brand-primary shadow-brand-primary/20"
                                )}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* File Delete Confirmation Modal */}
            {fileToDelete !== null && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Archivo?</h3>
                        <p className="text-sm text-gray-500 mb-8">
                            Estás a punto de eliminar este archivo de conocimiento.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFileToDelete(null)}
                                className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmRemoveFile}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Number Delete Confirmation Modal */}
            {showDeleteNumberModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Desvincular Número?</h3>
                        <p className="text-sm text-gray-500 mb-8">
                            El número se desvinculará de este agente en tu panel. No se eliminará de ElevenLabs ni de Meta.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteNumberModal(false)}
                                className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteNumber}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Sí, Desvincular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info/Success/Error Modal */}
            {infoModal.isOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            infoModal.type === 'success' ? "bg-brand-mint/10 text-brand-mint" : "bg-red-50 text-red-500"
                        )}>
                            {infoModal.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {infoModal.type === 'success' ? '¡Éxito!' : 'Ups, algo pasó'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 font-medium">
                            {infoModal.message}
                        </p>
                        <button
                            onClick={() => setInfoModal({ ...infoModal, isOpen: false })}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}

