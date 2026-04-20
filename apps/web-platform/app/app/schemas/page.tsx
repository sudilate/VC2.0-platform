"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSchema, listSchemas, type SchemaRecord } from "../../../lib/api";

const defaultSchemaJson = JSON.stringify(
  {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      id: { type: "string" },
      fullName: { type: "string" },
    },
    required: ["id", "fullName"],
  },
  null,
  2,
);

export default function SchemasPage() {
  const [schemas, setSchemas] = useState<SchemaRecord[]>([]);
  const [name, setName] = useState("Person Identity");
  const [version, setVersion] = useState("1.0.0");
  const [schemaUri, setSchemaUri] = useState("https://example.com/schemas/person-identity.json");
  const [schemaJsonText, setSchemaJsonText] = useState(defaultSchemaJson);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshSchemas() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listSchemas();
      setSchemas(response.schemas);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load schemas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshSchemas();
  }, []);

  async function handleCreateSchema(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const parsedSchema = JSON.parse(schemaJsonText) as Record<string, unknown>;
      await createSchema({ name, version, schemaUri, schemaJson: parsedSchema });
      setSuccessMessage("Schema created.");
      await refreshSchemas();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create schema.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Schemas</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Manage JSON schemas used for credential templates and issuance validation.</p>
      </div>

      <form onSubmit={handleCreateSchema} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Create schema</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 160px", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Version</span>
            <input value={version} onChange={(event) => setVersion(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
        </div>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Schema URI</span>
          <input value={schemaUri} onChange={(event) => setSchemaUri(event.target.value)} type="url" required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Schema JSON</span>
          <textarea value={schemaJsonText} onChange={(event) => setSchemaJsonText(event.target.value)} rows={14} style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, monospace" }} />
        </label>
        <button type="submit" disabled={isSubmitting} style={{ width: "fit-content", padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
          {isSubmitting ? "Saving..." : "Create schema"}
        </button>
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Existing schemas</h2>
        {isLoading ? <p>Loading schemas...</p> : null}
        {!isLoading && schemas.length === 0 ? <p style={{ color: "#475467" }}>No schemas created yet.</p> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {schemas.map((schema) => (
            <div key={schema.id} style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>{schema.name}</strong>
                <span style={{ color: "#667085" }}>v{schema.version}</span>
              </div>
              <div style={{ color: "#667085", fontSize: 14, marginTop: "0.25rem" }}>{schema.schemaUri}</div>
            </div>
          ))}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
