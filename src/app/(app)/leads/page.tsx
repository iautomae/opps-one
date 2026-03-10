"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeadsRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Default redirect for the simplified UI version
        router.push("/leads/app/dashboard");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="animate-pulse text-brand-turquoise font-bold uppercase tracking-widest text-xs">
                Cargando panel...
            </div>
        </div>
    );
}
