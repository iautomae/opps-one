"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { ClientLayout } from "@/components/ClientLayout";
import { ScreenLockOverlay } from "@/components/security/ScreenLockOverlay";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <ScreenLockOverlay>
                <ClientLayout>
                    {children}
                </ClientLayout>
            </ScreenLockOverlay>
        </AuthGuard>
    );
}
