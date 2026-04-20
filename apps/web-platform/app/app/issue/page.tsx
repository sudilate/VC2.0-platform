"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { issueCredential, listIssuedCredentials, listTemplates, type CredentialRecord, type TemplateRecord } from "../../../lib/api";

const VERIFY_STORAGE_KEY = "vc-platform:credential-to-verify";

const defaultClaimsJson = JSON.stringify(
  {
    fullName: "Amit Sarang",
    id: "EMP-001",
  },
  null,
  2,
);

export default function IssueCredentialPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [issuedCredentials, setIssuedCredentials] = useState<CredentialRecord[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [issuerDid, setIssuerDid] = useState("did:web:issuer.example.com");
  const [subjectDid, setSubjectDid] = useState("did:key:z6Mkexampleholder123");
  const [claimsJsonText, setClaimsJsonText] = useState(defaultClaimsJson);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedCredentialId, setCopiedCredentialId] = useState<string | null>(null);

  async function refreshData() {
    setIsLoading(true);
    setError(null);
    try {
      const [templateResponse, credentialResponse] = await Promise.all([listTemplates(), listIssuedCredentials()]);
      setTemplates(templateResponse.templates);
      setTemplateId((current) => current || templateResponse.templates[0]?.id || "");
      setIssuedCredentials(credentialResponse.credentials);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load issuance data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function handleIssueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const claims = JSON.parse(claimsJsonText) as Record<string, unknown>;
      await issueCredential({
        templateId,
        issuerDid,
        subjectDid,
        claims,
      });
      setSuccessMessage("Credential issued successfully.");
      await refreshData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to issue credential.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyCredential(credential: CredentialRecord) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(credential.credentialJson, null, 2));
      setCopiedCredentialId(credential.id);
      setSuccessMessage("Signed credential JSON copied to clipboard.");
    } catch {
      setError("Failed to copy credential JSON.");
    }
  }

  function handleOpenInVerifier(credential: CredentialRecord) {
    window.sessionStorage.setItem(VERIFY_STORAGE_KEY, JSON.stringify(credential.credentialJson));
    router.push("/app/verify");
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Issue Credential</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Issue a credential from one of your active-organization templates using structured claims input.</p>
      </div>

      <form onSubmit={handleIssueCredential} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>New issuance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Template</span>
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Issuer DID</span>
            <input value={issuerDid} onChange={(event) => setIssuerDid(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
        </div>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Subject DID</span>
          <input value={subjectDid} onChange={(event) => setSubjectDid(event.target.value)} required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Claims JSON</span>
          <textarea value={claimsJsonText} onChange={(event) => setClaimsJsonText(event.target.value)} rows={12} style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, monospace" }} />
        </label>
        <button type="submit" disabled={isSubmitting || !templateId} style={{ width: "fit-content", padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
          {isSubmitting ? "Issuing..." : "Issue credential"}
        </button>
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Recently issued credentials</h2>
        {isLoading ? <p>Loading issued credentials...</p> : null}
        {!isLoading && issuedCredentials.length === 0 ? <p style={{ color: "#475467" }}>No credentials issued yet.</p> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {issuedCredentials.map((credential) => (
            <div key={credential.id} style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: "0.85rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>{credential.credentialId}</strong>
                <span style={{ color: "#667085" }}>{credential.status}</span>
              </div>
              <div style={{ color: "#667085", fontSize: 14 }}>
                Issuer: {credential.issuerDid} | Subject: {credential.subjectDid}
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => void handleCopyCredential(credential)} style={{ padding: "0.5rem 0.8rem", borderRadius: 8, border: "1px solid #d0d5dd", background: "#fff", fontWeight: 600 }}>
                  {copiedCredentialId === credential.id ? "Copied" : "Copy JSON"}
                </button>
                <button type="button" onClick={() => handleOpenInVerifier(credential)} style={{ padding: "0.5rem 0.8rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
                  Open in verifier
                </button>
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 600, color: "#344054" }}>View signed credential JSON</summary>
                <pre style={{ marginTop: "0.75rem", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", fontSize: 13 }}>{JSON.stringify(credential.credentialJson, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
