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

function SectionTitle({ label }: { label: string }) {
  return <span style={{ color: "#98a2b3", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>;
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
      <header style={{ borderBottom: "1px solid #e4e7ec", background: "#fff", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <strong>VC Platform</strong>
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
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "1.2rem 1rem 2rem", display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: "1.25rem" }}>
        <aside style={{ alignSelf: "start", position: "sticky", top: 76 }}>
          <div style={{ border: "1px solid #e4e7ec", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
            <SectionTitle label="Workspace" />
            <nav style={{ display: "grid", gap: "0.55rem" }}>
              <NavLink href="/app" label="Overview" active={pathname === "/app"} />
              <NavLink href="/app/organization" label="Organization" active={pathname.startsWith("/app/organization")} />
              <NavLink href="/app/invitations" label="Invitations" active={pathname.startsWith("/app/invitations")} />
            </nav>
            <SectionTitle label="Operations" />
            <nav style={{ display: "grid", gap: "0.55rem" }}>
              <NavLink href="/app/issue" label="Issue Credential" active={pathname.startsWith("/app/issue")} />
              <NavLink href="/app/verify" label="Verify Credential" active={pathname.startsWith("/app/verify")} />
              <NavLink href="/app/schemas" label="Schemas" active={pathname.startsWith("/app/schemas")} />
              <NavLink href="/app/templates" label="Templates" active={pathname.startsWith("/app/templates")} />
            </nav>
            <SectionTitle label="Settings" />
            <nav style={{ display: "grid", gap: "0.55rem" }}>
              <NavLink href="/app/settings/members" label="Members" active={pathname.startsWith("/app/settings/members")} />
              <NavLink href="/app/settings/api-keys" label="API Keys" active={pathname.startsWith("/app/settings/api-keys")} />
            </nav>
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
