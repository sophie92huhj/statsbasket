import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import { MainNav } from "@/components/nav/MainNav";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { getSession } from "@/lib/auth/session";
import { getTrackedTeam } from "@/lib/repositories/trackedTeam";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

// Toutes les pages lisent la base : sans ça, Next pré-rend au build les pages sans
// paramètre dynamique (ex: /matchs) et les nouvelles données n'apparaissent jamais en prod.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "StatsBasket",
  description: "Analyse statistique de matchs de basket",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const team = session?.teamId ? await getTrackedTeam(session.teamId) : null;

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider isAdmin={session?.isAdmin ?? false} teamName={team?.name ?? null}>
          <MainNav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
