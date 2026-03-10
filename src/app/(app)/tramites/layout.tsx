import React from "react";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Trámites | Opps One',
    description: 'Gestión de trámites',
};

export default function TramitesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
