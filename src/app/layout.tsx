import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Golf Pool",
  description: "Live/semi-live golf tournament pools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accountName: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_name, is_admin")
      .eq("id", user.id)
      .single();
    accountName = profile?.account_name ?? user.email ?? null;
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3.5 backdrop-blur"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--background) 80%, transparent)" }}
        >
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-sm">⛳</span>
            Golf Pool
          </Link>
          {user ? (
            <div className="flex items-center gap-4 text-sm">
              <Link href="/leaderboard" className="text-muted transition-colors hover:text-foreground">
                Leaderboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-muted transition-colors hover:text-foreground">
                  Admin
                </Link>
              )}
              <span className="hidden text-muted sm:inline">{accountName}</span>
              <form action={signOut}>
                <button className="text-muted transition-colors hover:text-foreground">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium text-accent">
              Sign in
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
