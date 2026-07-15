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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_name")
      .eq("id", user.id)
      .single();
    accountName = profile?.account_name ?? user.email ?? null;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link href="/" className="font-semibold text-zinc-950 dark:text-zinc-50">
            Golf Pool
          </Link>
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {accountName}
              </span>
              <form action={signOut}>
                <button className="text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
            >
              Sign in
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
