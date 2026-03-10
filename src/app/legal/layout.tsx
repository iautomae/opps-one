import React from 'react';
import Link from 'next/link';

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-turquoise/30">
            {/* Minimal Navbar for Legal Pages */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-brand-turquoise/20" />
                        <span className="text-white text-lg font-bold tracking-tight">OPPS ONE</span>
                    </Link>
                    <Link href="/" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-brand-turquoise transition-colors">
                        Volver al Inicio
                    </Link>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    {children}
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 px-6">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                        © 2026 Opps One • Perú
                    </p>
                    <div className="flex gap-8">
                        <Link href="/legal/privacy" className="text-[10px] text-slate-600 uppercase tracking-widest hover:text-brand-turquoise">Privacidad</Link>
                        <Link href="/legal/terms" className="text-[10px] text-slate-600 uppercase tracking-widest hover:text-brand-turquoise">Términos</Link>
                        <Link href="/legal/libro-reclamaciones" className="text-[10px] text-slate-600 uppercase tracking-widest hover:text-brand-turquoise">Reclamaciones</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
