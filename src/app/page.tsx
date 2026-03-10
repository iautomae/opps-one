"use client";

import React from 'react';
import {
    Cpu,
    BarChart4,
    Zap,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { NeuralNetworkBackground } from '@/components/NeuralNetworkBackground';

export default function LandingPage() {
    return (
        <div className="relative w-full bg-[#050505] min-h-screen text-white selection:bg-brand-turquoise/30">
            {/* Navbar Minimalista */}
            <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-6 flex items-center justify-between backdrop-blur-md bg-black/20 border-b border-white/5">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src="/brand/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-brand-turquoise/20" />
                    <span className="text-xl font-bold tracking-tighter text-white">OPPS ONE</span>
                </Link>
                <div className="hidden md:flex items-center gap-10">
                    <a href="#nosotros" className="text-sm font-medium text-slate-400 hover:text-brand-turquoise transition-colors">Sobre Nosotros</a>
                    <a href="#que-hacemos" className="text-sm font-medium text-slate-400 hover:text-brand-turquoise transition-colors">Capacidades</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all backdrop-blur-sm">
                        Acceso Clientes
                    </Link>
                </div>
            </nav>

            <NeuralNetworkBackground
                particleCount={750}
                connectionDistance={155}
                mouseRadius={220}
            />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-8 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center space-y-8 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-turquoise/10 border border-brand-turquoise/30 backdrop-blur-sm mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="w-2 h-2 rounded-full bg-brand-turquoise" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-turquoise">Innovación impulsada por IA</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
                        SOFTWARE QUE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-turquoise to-white/80">PIENSA Y ESCALA.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg text-slate-300 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        En OPPS ONE desarrollamos ecosistemas digitales inteligentes. Desde agentes de IA autónomos hasta infraestructuras de software a medida para empresas que buscan el futuro hoy.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    </div>
                </div>

                {/* Floating Stats / Trust */}
                <div className="max-w-7xl mx-auto mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-white/5 py-12 relative z-10">
                    {[
                        { label: 'Eficiencia Operativa', value: '+85%' },
                        { label: 'Proyectos Entregados', value: '40+' },
                        { label: 'Precisión de la IA', value: '99.9%' },
                        { label: 'Soporte Global', value: '24/7' }
                    ].map((stat, i) => (
                        <div key={i} className="text-center group">
                            <p className="text-3xl font-bold text-white group-hover:text-brand-turquoise transition-colors tracking-tight">{stat.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Expertise Section - Unified Narrative */}
            <section id="que-hacemos" className="py-32 px-8 bg-gradient-to-b from-transparent to-black/40 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-3xl space-y-4 mb-20">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-turquoise">Nuestras Capacidades</h2>
                        <h3 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] uppercase">
                            TRANSFORMAMOS <br />
                            LA COMPLEJIDAD EN <br />
                            <span className="text-brand-turquoise">RENDIMIENTO.</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                        <div className="space-y-12">
                            <div className="group space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-brand-turquoise group-hover:bg-brand-turquoise group-hover:text-black transition-all">
                                        <Zap size={20} />
                                    </div>
                                    <h4 className="text-2xl font-bold text-white tracking-tight uppercase">Automatización de Procesos</h4>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    Eliminamos los cuellos de botella operativos mediante flujos de trabajo inteligentes. Diseñamos sistemas que ejecutan tareas repetitivas con autonomía total, permitiendo que su equipo se enfoque en la innovación.
                                </p>
                            </div>

                            <div className="group space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-brand-turquoise group-hover:bg-brand-turquoise group-hover:text-black transition-all">
                                        <BarChart4 size={20} />
                                    </div>
                                    <h4 className="text-2xl font-bold text-white tracking-tight uppercase">Optimización de Tiempos</h4>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    Reducimos drásticamente los ciclos de ejecución. Aplicamos algoritmos de optimización para garantizar que cada segundo de su infraestructura tecnológica genere el máximo valor posible.
                                </p>
                            </div>

                            <div className="group space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-brand-turquoise group-hover:bg-brand-turquoise group-hover:text-black transition-all">
                                        <Cpu size={20} />
                                    </div>
                                    <h4 className="text-2xl font-bold text-white tracking-tight uppercase">IA con Precisión Quirúrgica</h4>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    No solo usamos IA, la calibramos. Implementamos modelos de lenguaje y visión artificial diseñados para mejorar la precisión en la toma de decisiones y el análisis de datos críticos.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="sticky top-32 p-10 rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-xl space-y-8 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-turquoise/10 blur-[100px] -mr-32 -mt-32" />
                                <h4 className="text-xl font-bold text-white uppercase tracking-widest text-brand-turquoise">Por qué elegirnos</h4>
                                <p className="text-slate-200 font-medium leading-relaxed">
                                    Somos artesanos del código. En OPPS ONE, cada línea de software es una herramienta estratégica diseñada para escalar. No entregamos productos, entregamos ventajas competitivas.
                                </p>
                                <div className="space-y-4 pt-6">
                                    {[
                                        'Arquitecturas de Alta Disponibilidad',
                                        'Seguridad y Cifrado de Grado Militar',
                                        'Soporte Técnico de Élite'
                                    ].map(item => (
                                        <div key={item} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <CheckCircle2 size={16} className="text-brand-turquoise" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values / Why Us */}
            <section id="nosotros" className="py-32 px-8 relative z-10">
                <div className="max-w-3xl mx-auto text-center space-y-20">
                    <div className="space-y-6">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-turquoise">Filosofía OPPS ONE</h2>
                        <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">NUESTRO COMPROMISO ES <br /> TU ESCALABILIDAD.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-12 text-left">
                        {[
                            {
                                title: 'Arquitectura de Vanguardia',
                                desc: 'Utilizamos las tecnologías más modernas para garantizar que el software sea rápido, seguro y fácil de mantener.'
                            },
                            {
                                title: 'IA Centrada en el Humano',
                                desc: 'Diseñamos algoritmos que potencian las capacidades de tu equipo, no que los reemplazan.'
                            },
                            {
                                title: 'Transparencia Total',
                                desc: 'Trabajamos en ciclos cortos y ágiles para que siempre tengas visibilidad del progreso de tu proyecto.'
                            }
                        ].map((value, i) => (
                            <div key={i} className="flex gap-8 group">
                                <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full border border-brand-turquoise/30 text-brand-turquoise font-bold text-xl group-hover:bg-brand-turquoise group-hover:text-black transition-all">
                                    0{i + 1}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-white">{value.title}</h4>
                                    <p className="text-slate-400 leading-relaxed text-sm font-medium">{value.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-48 px-8 text-center relative z-10">
                <h2 className="text-6xl md:text-8xl font-bold text-white tracking-tight leading-[1.1] mb-12">
                    ¿ESTÁS <br /> LISTO?
                </h2>
            </section>
            {/* Footer Minimalista */}
            <footer className="bg-black py-20 px-8 border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <img src="/brand/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover grayscale opacity-50" />
                            <span className="text-lg font-bold tracking-tighter text-white/50">OPPS ONE</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                            Infraestructura digital para la próxima generación de empresas.
                            Automatización, Inteligencia Artificial y Escalabilidad sin límites.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white mb-6">Compañía</h4>
                        <ul className="space-y-3">
                            <li><a href="#nosotros" className="text-sm text-slate-500 hover:text-brand-turquoise transition-colors">Sobre Nosotros</a></li>
                            <li><a href="#que-hacemos" className="text-sm text-slate-500 hover:text-brand-turquoise transition-colors">Capacidades</a></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white mb-6">Legal</h4>
                        <ul className="space-y-3">
                            <li><a href="/legal/privacy" className="text-sm text-slate-500 hover:text-brand-turquoise transition-colors">Política de Privacidad</a></li>
                            <li><a href="/legal/terms" className="text-sm text-slate-500 hover:text-brand-turquoise transition-colors">Términos y Condiciones</a></li>
                            <li>
                                <a href="/legal/libro-reclamaciones" className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-turquoise transition-colors group">
                                    <span className="w-2 h-2 rounded-full bg-brand-turquoise/50 group-hover:bg-brand-turquoise transition-colors" />
                                    Libro de Reclamaciones
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-8">
                            © 2026 Opps One
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
