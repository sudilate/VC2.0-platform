"use client";

import { FormEvent, useEffect, useState } from "react";
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyRecord, type Environment } from "../../../../lib/api";

const environments: Environment[] = ["development", "staging", "production"];

function readEnvironment(metadata: unknown): Environment | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as { environment?: unknown }).environment;
  if (value === "development" || value === "staging" || value === "production") {
    return value;
  }

  return null;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [environmentFilter, setEnvironmentFilter] = useState<Environment | "all">("all");
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<Environment>("development");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshKeys(filter: Environment | "all" = environmentFilter) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listApiKeys(filter === "all" ? undefined : filter);
      setApiKeys(response.apiKeys);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load API keys.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshKeys();
  }, []);

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatedKey(null);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const expiresIn = Number.parseInt(expiresInDays, 10);
    try {
      const response = await createApiKey({
        environment,
        name: name || undefined,
        expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 24 * 60 * 60 : undefined,
      });
      setCreatedKey(response.key);
      setName("");
      setExpiresInDays("30");
      setSuccessMessage("API key created. Copy it now because it will not be shown again.");
      await refreshKeys();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create API key.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    setSuccessMessage(null);
    try {
      await revokeApiKey(id);
      setSuccessMessage("API key revoked.");
      await refreshKeys();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to revoke API key.");
    }
  }

  async function handleFilterChange(filter: Environment | "all") {
    setEnvironmentFilter(filter);
    await refreshKeys(filter);
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>API Keys</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Create machine credentials scoped to the active organization and environment.</p>
      </div>

      <form onSubmit={handleCreateKey} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Create API key</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px 160px auto", gap: "0.75rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="CI key" style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Environment</span>
            <select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)} style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              {environments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Expires in days</span>
            <input value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} type="number" min="1" style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
          <button type="submit" disabled={isSubmitting} style={{ padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
            {isSubmitting ? "Creating..." : "Create key"}
          </button>
        </div>
        {createdKey ? <div style={{ border: "1px solid #b2ddff", background: "#eff8ff", borderRadius: 10, padding: "0.85rem" }}><strong>New key:</strong> <code>{createdKey}</code></div> : null}
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h2 style={{ margin: 0 }}>Existing keys</h2>
          <select value={environmentFilter} onChange={(event) => void handleFilterChange(event.target.value as Environment | "all")} style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
            <option value="all">All environments</option>
            {environments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {isLoading ? <p>Loading API keys...</p> : null}
        {!isLoading && apiKeys.length === 0 ? <p style={{ color: "#475467" }}>No API keys found for this filter.</p> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: "0.8rem", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.75rem", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{apiKey.name || apiKey.start || apiKey.id}</div>
                <div style={{ color: "#667085", fontSize: 14 }}>
                  Environment: {readEnvironment(apiKey.metadata) ?? "unknown"}
                  {apiKey.createdAt ? ` | Created: ${new Date(apiKey.createdAt).toLocaleString()}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => void handleRevoke(apiKey.id)} style={{ border: "1px solid #fda29b", color: "#b42318", background: "#fff5f4", borderRadius: 8, padding: "0.45rem 0.75rem" }}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
