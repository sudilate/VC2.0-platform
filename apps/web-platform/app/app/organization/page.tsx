"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createOrganization,
  getActiveOrganization,
  listOrganizations,
  setActiveOrganization,
  type ActiveOrganizationResponse,
  type OrganizationSummary,
} from "../../../lib/api";

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export default function OrganizationPage() {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [activeOrganization, setActiveOrganizationState] = useState<ActiveOrganizationResponse["activeOrganization"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length >= 2 && slug.trim().length >= 2, [name, slug]);

  async function refreshData() {
    setIsLoading(true);
    setError(null);
    try {
      const [organizationList, active] = await Promise.all([listOrganizations(), getActiveOrganization()]);
      setOrganizations(organizationList);
      setActiveOrganizationState(active.activeOrganization);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load organizations.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
      });
      setSuccessMessage("Organization created and activated.");
      setName("");
      setSlug("");
      await refreshData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create organization.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetActiveOrganization(organizationId: string) {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await setActiveOrganization({ organizationId });
      setSuccessMessage("Active organization updated.");
      await refreshData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update active organization.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ marginBottom: 0 }}>Organization Context</h1>
      <p style={{ marginTop: 0, color: "#475467" }}>Create and switch active organizations for your current account session.</p>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Active organization</h2>
        {activeOrganization ? (
          <p style={{ marginBottom: 0 }}>
            <strong>{activeOrganization.name}</strong> <span style={{ color: "#475467" }}>({activeOrganization.slug})</span>
          </p>
        ) : (
          <p style={{ marginBottom: 0, color: "#475467" }}>No active organization set.</p>
        )}
      </div>

      <form
        onSubmit={handleCreateOrganization}
        style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Create organization</h2>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (!slug) {
                setSlug(toSlug(value));
              }
            }}
            required
            minLength={2}
            style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Slug</span>
          <input
            value={slug}
            onChange={(event) => setSlug(toSlug(event.target.value))}
            required
            minLength={2}
            pattern="[a-z0-9-]+"
            style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </label>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          style={{
            width: "fit-content",
            padding: "0.65rem 0.9rem",
            borderRadius: 8,
            border: "none",
            background: "#0f4c81",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isSubmitting ? "Working..." : "Create organization"}
        </button>
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Available organizations</h2>
        {isLoading ? <p>Loading organizations...</p> : null}
        {!isLoading && organizations.length === 0 ? <p style={{ color: "#475467" }}>No organizations found.</p> : null}

        <div style={{ display: "grid", gap: "0.6rem" }}>
          {organizations.map((organization) => {
            const isActive = activeOrganization?.id === organization.id;
            return (
              <div
                key={organization.id}
                style={{
                  border: "1px solid #e4e7ec",
                  borderRadius: 10,
                  padding: "0.7rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <strong>{organization.name}</strong>
                  <div style={{ color: "#667085" }}>{organization.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSetActiveOrganization(organization.id)}
                  disabled={isActive || isSubmitting}
                  style={{ border: "1px solid #d0d5dd", borderRadius: 8, padding: "0.45rem 0.7rem", background: isActive ? "#eef4ff" : "#fff" }}
                >
                  {isActive ? "Active" : "Set active"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
