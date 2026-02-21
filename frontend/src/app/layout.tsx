import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ProgressBar from "@/components/progress-bar";
import { Suspense } from "react";

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                if (theme === 'dark' || (!theme && supportDarkMode)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning>
        <ClerkProvider localization={frFR}>
          <Suspense fallback={null}>
            <ProgressBar />
          </Suspense>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
