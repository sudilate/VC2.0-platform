const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ActiveOrganizationResponse {
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
    members?: Array<{ id: string; role: string }>;
    invitations?: Array<{ id: string; email: string; status: string }>;
  } | null;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
    return `${response.status} ${response.statusText}`;
  }

  return `${response.status} ${response.statusText}`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function listOrganizations() {
  return apiFetch<OrganizationSummary[]>("/v1/organizations", {
    method: "GET",
  });
}

export async function getActiveOrganization() {
  return apiFetch<ActiveOrganizationResponse>("/v1/organizations/active", {
    method: "GET",
  });
}

export async function createOrganization(input: { name: string; slug: string }) {
  return apiFetch<{ organization: OrganizationSummary }>("/v1/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setActiveOrganization(input: { organizationId?: string | null; organizationSlug?: string }) {
  return apiFetch<{ activeOrganizationId?: string | null }>("/v1/organizations/active", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
