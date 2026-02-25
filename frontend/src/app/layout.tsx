import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ProgressBar from "@/components/progress-bar";
import { Suspense } from "react";
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
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider localization={frFR}>
            <I18nProvider>
              <Suspense fallback={null}>
                <ProgressBar />
              </Suspense>
              {children}
              <Toaster />
            </I18nProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
