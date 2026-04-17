"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveOrganization, type ActiveOrganizationResponse } from "../../lib/api";

export default function AppOverviewPage() {
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganizationResponse["activeOrganization"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getActiveOrganization();
        setActiveOrganization(response.activeOrganization);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load active organization.");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  if (isLoading) {
    return <p>Loading organization context...</p>;
  }

  if (error) {
    return <p style={{ color: "#b42318" }}>{error}</p>;
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ marginBottom: 0 }}>Workspace Overview</h1>
      <p style={{ marginTop: 0, color: "#475467" }}>
        Session and organization context are now integrated across separate web and API origins.
      </p>

      {activeOrganization ? (
        <div style={{ border: "1px solid #dbe1ea", background: "#fff", borderRadius: 12, padding: "1rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>{activeOrganization.name}</h2>
          <p style={{ marginTop: 0, color: "#475467" }}>Slug: {activeOrganization.slug}</p>
          <p style={{ marginBottom: 0, color: "#475467" }}>
            Members: {activeOrganization.members?.length ?? 0} | Pending invitations: {activeOrganization.invitations?.length ?? 0}
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid #dbe1ea", background: "#fff", borderRadius: 12, padding: "1rem" }}>
          <p style={{ marginTop: 0 }}>No active organization selected yet.</p>
          <Link href="/app/organization">Create or select an organization</Link>
        </div>
      )}
    </section>
  );
}
