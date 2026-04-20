"use client";

import { FormEvent, useEffect, useState } from "react";
import { createTemplate, listSchemas, listTemplates, type SchemaRecord, type TemplateRecord } from "../../../lib/api";

const defaultTemplateJson = JSON.stringify(
  {
    type: ["VerifiableCredential", "PersonIdentityCredential"],
    claims: {
      fullName: "",
      id: "",
    },
  },
  null,
  2,
);

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [schemas, setSchemas] = useState<SchemaRecord[]>([]);
  const [schemaId, setSchemaId] = useState("");
  const [name, setName] = useState("Person Identity Template");
  const [templateJsonText, setTemplateJsonText] = useState(defaultTemplateJson);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshData() {
    setIsLoading(true);
    setError(null);
    try {
      const [templatesResponse, schemasResponse] = await Promise.all([listTemplates(), listSchemas()]);
      setTemplates(templatesResponse.templates);
      setSchemas(schemasResponse.schemas);
      setSchemaId((current) => current || schemasResponse.schemas[0]?.id || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load templates.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const parsedTemplate = JSON.parse(templateJsonText) as Record<string, unknown>;
      await createTemplate({ schemaId, name, templateJson: parsedTemplate });
      setSuccessMessage("Template created.");
      await refreshData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create template.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Templates</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Attach business-friendly credential templates to your active organization schemas.</p>
      </div>

      <form onSubmit={handleCreateTemplate} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Create template</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Schema</span>
            <select value={schemaId} onChange={(event) => setSchemaId(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              {schemas.map((schema) => (
                <option key={schema.id} value={schema.id}>{schema.name} (v{schema.version})</option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Template JSON</span>
          <textarea value={templateJsonText} onChange={(event) => setTemplateJsonText(event.target.value)} rows={14} style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, monospace" }} />
        </label>
        <button type="submit" disabled={isSubmitting || !schemaId} style={{ width: "fit-content", padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
          {isSubmitting ? "Saving..." : "Create template"}
        </button>
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Existing templates</h2>
        {isLoading ? <p>Loading templates...</p> : null}
        {!isLoading && templates.length === 0 ? <p style={{ color: "#475467" }}>No templates created yet.</p> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {templates.map((template) => {
            const schema = schemas.find((item) => item.id === template.schemaId);
            return (
              <div key={template.id} style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{template.name}</strong>
                  <span style={{ color: "#667085" }}>{template.status}</span>
                </div>
                <div style={{ color: "#667085", fontSize: 14, marginTop: "0.25rem" }}>Schema: {schema ? `${schema.name} (v${schema.version})` : template.schemaId}</div>
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
