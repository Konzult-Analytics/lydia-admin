import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lydia Admin Portal",
  description: "Admin portal for Lydia - AI-powered insurance research assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("lydia-admin-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
