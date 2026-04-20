"use client";

import { useState, useEffect } from "react";
import { acceptInvitation, listUserInvitations, rejectInvitation, setActiveOrganization, type InvitationRecord } from "../../../lib/api";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [acceptedOrganizationId, setAcceptedOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshInvitations() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listUserInvitations();
      setInvitations(response.invitations);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load invitations.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshInvitations();
  }, []);

  async function handleAccept(invitation: InvitationRecord) {
    setPendingActionId(invitation.id);
    setError(null);
    setSuccessMessage(null);
    setAcceptedOrganizationId(null);
    try {
      await acceptInvitation(invitation.id);
      setSuccessMessage(`Accepted invitation to ${invitation.organizationName ?? invitation.organizationId ?? "organization"}.`);
      setAcceptedOrganizationId(invitation.organizationId ?? null);
      await refreshInvitations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to accept invitation.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject(invitation: InvitationRecord) {
    setPendingActionId(invitation.id);
    setError(null);
    setSuccessMessage(null);
    setAcceptedOrganizationId(null);
    try {
      await rejectInvitation(invitation.id);
      setSuccessMessage(`Declined invitation to ${invitation.organizationName ?? invitation.organizationId ?? "organization"}.`);
      await refreshInvitations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to decline invitation.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleSwitchOrganization() {
    if (!acceptedOrganizationId) {
      return;
    }

    setPendingActionId(acceptedOrganizationId);
    setError(null);
    try {
      await setActiveOrganization({ organizationId: acceptedOrganizationId });
      setSuccessMessage("Invitation accepted and active organization switched.");
      setAcceptedOrganizationId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to switch active organization.");
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Invitations</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Review organization invitations and decide whether to join or decline.</p>
      </div>

      {acceptedOrganizationId ? (
        <div style={{ border: "1px solid #b7ebc6", background: "#ecfdf3", borderRadius: 12, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <span>You joined a new organization. Switch your active organization if you want to work there now.</span>
          <button type="button" onClick={() => void handleSwitchOrganization()} disabled={pendingActionId === acceptedOrganizationId} style={{ padding: "0.65rem 0.9rem", borderRadius: 8, border: "1px solid #84ca99", background: "#fff", color: "#067647", fontWeight: 600 }}>
            {pendingActionId === acceptedOrganizationId ? "Switching..." : "Switch active org"}
          </button>
        </div>
      ) : null}

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Pending invitations</h2>
        {isLoading ? <p>Loading invitations...</p> : null}
        {!isLoading && invitations.length === 0 ? <p style={{ color: "#475467" }}>You have no pending invitations.</p> : null}

        <div style={{ display: "grid", gap: "0.75rem" }}>
          {invitations.map((invitation) => (
            <div key={invitation.id} style={{ border: "1px solid #eaecf0", borderRadius: 10, padding: "0.85rem", display: "grid", gap: "0.65rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{invitation.organizationName ?? invitation.organizationId}</div>
                <div style={{ color: "#667085", fontSize: 14 }}>
                  Role: {invitation.role} | Status: {invitation.status}
                </div>
                <div style={{ color: "#667085", fontSize: 14 }}>
                  Invited email: {invitation.email}
                  {invitation.expiresAt ? ` | Expires: ${new Date(invitation.expiresAt).toLocaleString()}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void handleAccept(invitation)}
                  disabled={pendingActionId === invitation.id}
                  style={{ padding: "0.6rem 0.85rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}
                >
                  {pendingActionId === invitation.id ? "Working..." : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject(invitation)}
                  disabled={pendingActionId === invitation.id}
                  style={{ padding: "0.6rem 0.85rem", borderRadius: 8, border: "1px solid #fda29b", background: "#fff5f4", color: "#b42318", fontWeight: 600 }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
