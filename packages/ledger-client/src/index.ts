import type { DidResolutionResult } from "@vc-platform/types";

export interface JsonSchemaDocument extends Record<string, unknown> {}

export interface SchemaCache {
  get(uri: string): Promise<JsonSchemaDocument | null>;
  set(uri: string, schema: JsonSchemaDocument): Promise<void>;
}

export async function resolveDid(did: string): Promise<DidResolutionResult> {
  if (did.startsWith("did:key:")) {
    return resolveDidKey(did);
  }

  if (did.startsWith("did:web:")) {
    return resolveDidWeb(did);
  }

  throw new Error(`Unsupported DID method: ${did}`);
}

export async function resolveDidKey(did: string): Promise<DidResolutionResult> {
  return {
    did,
    document: {
      id: did,
      verificationMethod: [],
    },
    metadata: {
      method: "did:key",
      source: "phase-1-placeholder",
    },
  };
}

export async function resolveDidWeb(did: string): Promise<DidResolutionResult> {
  const domain = did.replace("did:web:", "").replace(/:/g, "/");
  const url = `https://${domain}/did.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to resolve did:web document from ${url}`);
  }

  return {
    did,
    document: (await response.json()) as Record<string, unknown>,
    metadata: {
      method: "did:web",
      url,
    },
  };
}

export async function fetchSchema(uri: string, cache?: SchemaCache): Promise<JsonSchemaDocument> {
  const cached = cache ? await cache.get(uri) : null;
  if (cached) {
    return cached;
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema from ${uri}`);
  }

  const schema = (await response.json()) as JsonSchemaDocument;
  if (cache) {
    await cache.set(uri, schema);
  }

  return schema;
}
