import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem 1.25rem" }}>
      <div
        style={{
          border: "1px solid #dbe1ea",
          borderRadius: 16,
          background: "linear-gradient(165deg, #ffffff, #f2f6ff)",
          padding: "2rem",
          boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>VC Platform</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>
          Enterprise VC 2.0 platform with gateway-hosted auth and organization-scoped workflows.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <Link
            href="/sign-in"
            style={{
              background: "#0f4c81",
              color: "#fff",
              textDecoration: "none",
              padding: "0.65rem 1rem",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            style={{
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              textDecoration: "none",
              padding: "0.65rem 1rem",
              borderRadius: 10,
              fontWeight: 600,
              background: "#ffffff",
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
