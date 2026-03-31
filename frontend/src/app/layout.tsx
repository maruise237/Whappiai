import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClientClerkProvider } from "@/providers/clerk-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ProgressBar from "@/components/progress-bar";
import { Suspense } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/i18n/i18n-provider";

export const metadata: Metadata = {
  title: "Whappi | Passerelle WhatsApp",
  description: "Passerelle API WhatsApp ultra-légère",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://randomuser.me" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://randomuser.me" />

      </head>
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning>
        <Script defer src="https://umami.kamtech.online/script.js" data-website-id="b0bec36c-f5ba-478e-8072-62c831565bad" strategy="afterInteractive" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientClerkProvider>
            <I18nProvider>
              <Suspense fallback={null}>
                <ProgressBar />
              </Suspense>
              {children}
              <Toaster />
            </I18nProvider>
          </ClientClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
