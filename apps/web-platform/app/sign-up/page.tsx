"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { signUp, useSession } from "../../lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password1234");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/app");
    }
  }, [isPending, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signUp.email({
      name,
      email,
      password,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Sign-up failed.");
      return;
    }

    router.replace("/app");
  }

  return (
    <main style={{ maxWidth: "420px", margin: "5rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Create account</h1>
      <p style={{ color: "#475467", marginTop: 0 }}>Create your platform account to start managing organizations and credentials.</p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #dbe1ea",
          borderRadius: 12,
          padding: "1rem",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} type="text" required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>

        {error ? <p style={{ color: "#b42318", margin: 0 }}>{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.65rem 0.9rem",
            borderRadius: 8,
            border: "none",
            background: "#0f4c81",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem", color: "#475467" }}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
