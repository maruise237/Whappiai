import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ProgressBar from "@/components/progress-bar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Whappi | Passerelle WhatsApp",
  description: "Passerelle API WhatsApp ultra-légère",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ClerkProvider localization={frFR}>
          <Suspense fallback={null}>
            <ProgressBar />
          </Suspense>
          {children}
          <InstallPrompt />
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
