"use client";

import { FormEvent, useEffect, useState } from "react";
import { createInvitation, listMembers, type OrganizationMember, updateMemberRole } from "../../../../lib/api";

type AssignableRole = "admin" | "issuer" | "verifier";

export default function MembersPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("issuer");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshMembers() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listMembers();
      setMembers(response.members);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load organization members.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshMembers();
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await createInvitation({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setInviteRole("issuer");
      setSuccessMessage("Invitation created successfully.");
      await refreshMembers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: AssignableRole) {
    setError(null);
    setSuccessMessage(null);
    try {
      await updateMemberRole(memberId, { role });
      setSuccessMessage("Member role updated.");
      await refreshMembers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update member role.");
    }
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Member Management</h1>
        <p style={{ marginTop: 0, color: "#475467" }}>Invite new teammates and adjust organization roles.</p>
      </div>

      <form onSubmit={handleInvite} style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Invite member</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px auto", gap: "0.75rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Email</span>
            <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" required style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Role</span>
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AssignableRole)} style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              <option value="admin">Admin</option>
              <option value="issuer">Issuer</option>
              <option value="verifier">Verifier</option>
            </select>
          </label>
          <button type="submit" disabled={isSubmitting} style={{ padding: "0.7rem 1rem", borderRadius: 8, border: "none", background: "#0f4c81", color: "#fff", fontWeight: 600 }}>
            {isSubmitting ? "Inviting..." : "Send invite"}
          </button>
        </div>
      </form>

      <div style={{ border: "1px solid #dbe1ea", borderRadius: 12, background: "#fff", padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Members</h2>
        {isLoading ? <p>Loading members...</p> : null}
        {!isLoading && members.length === 0 ? <p style={{ color: "#475467" }}>No members found in the active organization.</p> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {members.map((member) => (
            <div key={member.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px", gap: "0.75rem", alignItems: "center", border: "1px solid #eaecf0", borderRadius: 10, padding: "0.8rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{member.user?.name || member.user?.email || member.id}</div>
                <div style={{ color: "#667085", fontSize: 14 }}>{member.user?.email || member.userId}</div>
              </div>
              <select
                value={member.role}
                onChange={(event) => void handleRoleChange(member.id, event.target.value as AssignableRole)}
                disabled={member.role === "owner"}
                style={{ padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="issuer">Issuer</option>
                <option value="verifier">Verifier</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: "#067647" }}>{successMessage}</p> : null}
    </section>
  );
}
