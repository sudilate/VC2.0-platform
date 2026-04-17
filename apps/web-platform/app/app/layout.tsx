"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { signOut, useSession } from "../../lib/auth-client";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: active ? "#0f4c81" : "#344054",
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </Link>
  );
}

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, router, session]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    router.replace("/sign-in");
  }

  if (isPending || !session) {
    return <main style={{ padding: "2rem" }}>Checking your session...</main>;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: "1px solid #e4e7ec",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <strong>VC Platform</strong>
            <nav style={{ display: "flex", gap: "0.9rem" }}>
              <NavLink href="/app" label="Overview" active={pathname === "/app"} />
              <NavLink href="/app/organization" label="Organization" active={pathname.startsWith("/app/organization")} />
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "#475467", fontSize: 14 }}>{session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{ border: "1px solid #d0d5dd", background: "#fff", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer" }}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.2rem 1rem 2rem" }}>{children}</main>
    </div>
  );
}
