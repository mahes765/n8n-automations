import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/app/logout-button";

export const metadata: Metadata = {
  title: "Subscription Bot",
  description: "Next.js + Supabase subscription system for Telegram and n8n.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="id">
      <body>
        <main className="shell">
          <nav className="nav">
            <Link className="brand" href="/plans">
              Subscription Bot
            </Link>
            <div className="nav-links">
              {user ? (
                <>
                  <span className="muted">{user.email}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link className="button secondary" href="/login">
                    Login
                  </Link>
                  <Link className="button" href="/register">
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
