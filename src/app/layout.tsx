import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { UIProvider } from "@/hooks/useUI";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Opps One | Multi-Service SaaS",
  description: "Unified Dashboard for Leads, Documents and Forms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased font-sans`}>
        <AuthProvider>
          <Suspense>
            <ProfileProvider>
              <UIProvider>
                {children}
              </UIProvider>
            </ProfileProvider>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
