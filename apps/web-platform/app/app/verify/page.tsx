"use client";

import { FormEvent, useEffect, useState } from "react";
import { verifyCredential, type CredentialVerificationResult } from "../../../lib/api";

const VERIFY_STORAGE_KEY = "vc-platform:credential-to-verify";

const defaultCredentialJson = JSON.stringify(
  {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: "urn:uuid:example",
    type: ["VerifiableCredential"],
    issuer: "did:web:issuer.example.com",
    validFrom: "2026-01-01T00:00:00Z",
    credentialSubject: {
      id: "did:key:z6Mkexampleholder123",
      fullName: "Amit Sarang",
    },
    proof: {
      type: "Ed25519Signature2020",
      verificationMethod: "did:web:issuer.example.com#keys-1",
      publicKeyMultibase: "zReplaceWithIssuedCredential",
      proofValue: "zReplaceWithIssuedCredential",
    },
  },
  null,
  2,
);

export default function VerifyCredentialPage() {
  const [credentialJsonText, setCredentialJsonText] = useState(defaultCredentialJson);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verification, setVerification] = useState<CredentialVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefilled = window.sessionStorage.getItem(VERIFY_STORAGE_KEY);
    if (!prefilled) {
      return;
    }

    setCredentialJsonText(JSON.stringify(JSON.parse(prefilled), null, 2));
    setPrefillMessage("Loaded the most recently selected issued credential. Review it and verify when ready.");
    window.sessionStorage.removeItem(VERIFY_STORAGE_KEY);
  }, []);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setVerification(null);

    try {
      const credential = JSON.parse(credentialJsonText) as Record<string, unknown>;
      const response = await verifyCredential({ credential });
      setVerification(response.verification);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to verify credential.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Verify Credential</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Paste a signed credential and validate its Ed25519 proof.</p>
      </div>

      {prefillMessage ? <p style={{ margin: 0, color: "#067647" }}>{prefillMessage}</p> : null}

      <form onSubmit={handleVerify} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Credential JSON</span>
          <textarea value={credentialJsonText} onChange={(event) => setCredentialJsonText(event.target.value)} rows={18} style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, monospace" }} />
        </label>
        <button type="submit" disabled={isSubmitting} style={{ width: "fit-content", padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
          {isSubmitting ? "Verifying..." : "Verify credential"}
        </button>
      </form>

      {verification ? (
        <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Verification result</h2>
          <div><strong>Success:</strong> {verification.success ? "Yes" : "No"}</div>
          <div><strong>Signature valid:</strong> {verification.isSignatureValid ? "Yes" : "No"}</div>
          <div><strong>Issuer DID:</strong> {verification.issuerDid ?? "n/a"}</div>
          <div><strong>Verification method:</strong> {verification.verificationMethod ?? "n/a"}</div>
          {verification.errors && verification.errors.length > 0 ? (
            <div style={{ color: "#b42318" }}><strong>Errors:</strong> {verification.errors.join(", ")}</div>
          ) : null}
        </div>
      ) : null}

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
    </section>
  );
}
