import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/ui/app-sidebar";
import React from "react";
import {ThemeProvider} from "@/components/ui/theme-provider";
import AuthProvider from "@/app/authprovider";

export const runtime = 'nodejs';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VT Toolkit",
  description: "Tools ",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <link rel="manifest" href="/manifest.json" />
            <title>Toolkit</title>
        </head>
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <AuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <SidebarProvider>
                    <AppSidebar />
                    {/* FIX: Replace <main> with <SidebarInset> for correct layout */}
                    <SidebarInset>
                        <header className="p-4 md:hidden">
                            <SidebarTrigger />
                        </header>
                        {children}
                    </SidebarInset>
                </SidebarProvider>
            </ThemeProvider>
        </AuthProvider>
        </body>
        </html>
    );
}
