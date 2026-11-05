import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PM Kanban | Modular Project Management",
  description: "Enterprise Modular Kanban & Timeline Platform powered by Next.js and MySQL",
};

import Script from "next/script";
import { ThemeInitializer } from "@/components/ThemeInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script
          id="bis-sanitizer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var o=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==='bis_skin_checked')return;return o.apply(this,arguments);};var r=function(){var e=document.querySelectorAll('[bis_skin_checked]');for(var i=0;i<e.length;i++)e[i].removeAttribute('bis_skin_checked');};r();if(window.MutationObserver){new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].attributeName==='bis_skin_checked'&&m[i].target){m[i].target.removeAttribute('bis_skin_checked');}}}).observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['bis_skin_checked']});}}catch(e){}})();`,
          }}
        />
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
