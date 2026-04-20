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
  // did:key format: did:key:<multibase-encoded-public-key>
  // For Ed25519: multicodec prefix is 0xed01 (varint: 0xed 0x01)
  
  const parts = did.split(":");
  if (parts.length !== 3 || parts[0] !== "did" || parts[1] !== "key") {
    throw new Error(`Invalid did:key format: ${did}`);
  }
  
  const multibaseKey = parts[2];
  
  // Decode multibase (base58btc starts with 'z')
  if (!multibaseKey.startsWith("z")) {
    throw new Error(`Unsupported multibase encoding for did:key: ${multibaseKey}`);
  }
  
  // Base58 decode
  const decoded = base58Decode(multibaseKey.slice(1));
  
  // Check multicodec prefix for Ed25519 (0xed01)
  if (decoded.length < 2 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error(`Unsupported key type in did:key. Expected Ed25519 (0xed01 prefix)`);
  }
  
  // Extract the 32-byte Ed25519 public key
  const publicKeyBytes = decoded.slice(2);
  if (publicKeyBytes.length !== 32) {
    throw new Error(`Invalid Ed25519 public key length: expected 32 bytes, got ${publicKeyBytes.length}`);
  }
  
  // Encode public key as multibase for the verification method
  const prefixAndKey = new Uint8Array([0xed, 0x01, ...publicKeyBytes]);
  const publicKeyMultibase = "z" + base58Encode(prefixAndKey);
  
  return {
    did,
    document: {
      id: did,
      verificationMethod: [
        {
          id: `${did}#${did.split(":")[2]}`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase,
        },
      ],
      authentication: [`${did}#${did.split(":")[2]}`],
      assertionMethod: [`${did}#${did.split(":")[2]}`],
      capabilityInvocation: [`${did}#${did.split(":")[2]}`],
      capabilityDelegation: [`${did}#${did.split(":")[2]}`],
    },
    metadata: {
      method: "did:key",
      keyType: "Ed25519",
    },
  };
}

// Simple base58 implementation for did:key resolution
function base58Decode(str: string): Uint8Array {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const base = BigInt(58);
  
  let num = BigInt(0);
  for (const char of str) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * base + BigInt(idx);
  }
  
  // Convert to bytes
  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num % BigInt(256)));
    num = num / BigInt(256);
  }
  
  // Add leading zero bytes for each leading '1' in the string
  for (const char of str) {
    if (char === "1") bytes.unshift(0);
    else break;
  }
  
  return new Uint8Array(bytes);
}

function base58Encode(bytes: Uint8Array): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const base = BigInt(58);
  
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }
  
  let str = "";
  while (num > BigInt(0)) {
    str = alphabet[Number(num % base)] + str;
    num = num / base;
  }
  
  // Add leading '1's for zero bytes
  for (const byte of bytes) {
    if (byte === 0) str = "1" + str;
    else break;
  }
  
  return str;
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
