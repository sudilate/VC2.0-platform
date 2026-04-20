use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tonic::{transport::Server, Request, Response, Status};

pub mod crypto {
    tonic::include_proto!("vcplatform.crypto.v1");
}

use crypto::crypto_engine_server::{CryptoEngine, CryptoEngineServer};
use crypto::{
    SignCredentialRequest, SignCredentialResponse, VerifyCredentialRequest,
    VerifyCredentialResponse, VerifyPresentationRequest, VerifyPresentationResponse,
};

#[derive(Default)]
struct CryptoEngineService;

fn derive_signing_key(payload: &SignCredentialRequest) -> SigningKey {
    let mut hasher = Sha256::new();
    hasher.update(payload.organization_id.as_bytes());
    hasher.update(b":");
    hasher.update(payload.environment.as_bytes());
    hasher.update(b":");
    hasher.update(payload.key_ref.as_bytes());
    let digest = hasher.finalize();
    let mut secret = [0u8; 32];
    secret.copy_from_slice(&digest[..32]);
    SigningKey::from_bytes(&secret)
}

fn canonicalize_string(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_string())
}

fn canonicalize_json(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(boolean) => boolean.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(string) => canonicalize_string(string),
        Value::Array(items) => {
            let joined = items
                .iter()
                .map(canonicalize_json)
                .collect::<Vec<_>>()
                .join(",");
            format!("[{joined}]")
        }
        Value::Object(map) => {
            let mut entries = map.iter().collect::<Vec<_>>();
            entries.sort_by(|a, b| a.0.cmp(b.0));
            let joined = entries
                .into_iter()
                .map(|(key, value)| format!("{}:{}", canonicalize_string(key), canonicalize_json(value)))
                .collect::<Vec<_>>()
                .join(",");
            format!("{{{joined}}}")
        }
    }
}

fn sign_credential_json(payload: &SignCredentialRequest) -> Result<String, Status> {
    let mut credential: Value = serde_json::from_str(&payload.credential_payload_json)
        .map_err(|error| Status::invalid_argument(format!("Invalid credential payload: {error}")))?;

    let signing_key = derive_signing_key(payload);
    let verifying_key = signing_key.verifying_key();
    let canonical = canonicalize_json(&credential);
    let signature = signing_key.sign(canonical.as_bytes());

    let created = credential
        .get("validFrom")
        .and_then(Value::as_str)
        .unwrap_or("1970-01-01T00:00:00Z");

    let proof = serde_json::json!({
        "type": payload.signature_suite,
        "cryptosuite": "pragmatic-ed25519-v1",
        "created": created,
        "proofPurpose": "assertionMethod",
        "verificationMethod": format!("{}#keys-1", payload.issuer_did),
        "publicKeyMultibase": format!("z{}", bs58::encode(verifying_key.as_bytes()).into_string()),
        "proofValue": format!("z{}", bs58::encode(signature.to_bytes()).into_string()),
    });

    match credential {
        Value::Object(ref mut object) => {
            object.insert("proof".to_string(), proof);
        }
        _ => {
            return Err(Status::invalid_argument(
                "Credential payload must be a JSON object".to_string(),
            ));
        }
    }

    serde_json::to_string(&credential)
        .map_err(|error| Status::internal(format!("Failed to serialize signed credential: {error}")))
}

fn verify_signed_credential(input_json: &str) -> Result<String, Status> {
    let mut credential: Value = serde_json::from_str(input_json)
        .map_err(|error| Status::invalid_argument(format!("Invalid verification input: {error}")))?;

    let proof = match credential.get("proof") {
        Some(Value::Object(map)) => map.clone(),
        _ => {
            return Ok(serde_json::json!({
                "success": false,
                "isSignatureValid": false,
                "errors": ["Credential proof is missing or malformed"],
            })
            .to_string())
        }
    };

    if let Value::Object(ref mut object) = credential {
        object.remove("proof");
    }

    let public_key_multibase = proof
        .get("publicKeyMultibase")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let proof_value = proof
        .get("proofValue")
        .and_then(Value::as_str)
        .unwrap_or_default();

    let public_key_bytes = bs58::decode(public_key_multibase.trim_start_matches('z'))
        .into_vec()
        .map_err(|error| Status::invalid_argument(format!("Invalid public key multibase: {error}")))?;
    let signature_bytes = bs58::decode(proof_value.trim_start_matches('z'))
        .into_vec()
        .map_err(|error| Status::invalid_argument(format!("Invalid proof value: {error}")))?;

    let verifying_key = VerifyingKey::from_bytes(
        &public_key_bytes
            .try_into()
            .map_err(|_| Status::invalid_argument("Public key must be 32 bytes".to_string()))?,
    )
    .map_err(|error| Status::invalid_argument(format!("Failed to parse public key: {error}")))?;

    let signature = Signature::from_bytes(
        &signature_bytes
            .try_into()
            .map_err(|_| Status::invalid_argument("Signature must be 64 bytes".to_string()))?,
    );

    let canonical = canonicalize_json(&credential);
    let verification = verifying_key.verify(canonical.as_bytes(), &signature);

    let response = match verification {
        Ok(_) => serde_json::json!({
            "success": true,
            "isSignatureValid": true,
            "issuerDid": credential.get("issuer").and_then(Value::as_str),
            "verificationMethod": proof.get("verificationMethod").and_then(Value::as_str),
            "errors": [],
        }),
        Err(error) => serde_json::json!({
            "success": false,
            "isSignatureValid": false,
            "issuerDid": credential.get("issuer").and_then(Value::as_str),
            "verificationMethod": proof.get("verificationMethod").and_then(Value::as_str),
            "errors": [format!("Signature verification failed: {error}")],
        }),
    };

    Ok(response.to_string())
}

fn verify_signed_presentation(input_json: &str) -> Result<String, Status> {
    let presentation: Value = serde_json::from_str(input_json)
        .map_err(|error| Status::invalid_argument(format!("Invalid presentation JSON: {error}")))?;

    let presentation_id = presentation
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("unknown");

    let holder_did = presentation
        .get("holder")
        .and_then(Value::as_str)
        .unwrap_or_default();

    // Verify presentation proof
    let proof_verification = verify_presentation_proof(&presentation, &holder_did)?;

    // Extract and verify embedded credentials
    let credentials_verification = verify_presentation_credentials(&presentation)?;

    let overall_success = proof_verification.is_valid && credentials_verification.all_valid;

    let response = serde_json::json!({
        "success": overall_success,
        "presentationId": presentation_id,
        "holderDid": holder_did,
        "proofVerification": {
            "isValid": proof_verification.is_valid,
            "verificationMethod": proof_verification.verification_method,
            "errors": proof_verification.errors,
        },
        "credentialsVerification": {
            "totalCredentials": credentials_verification.total_count,
            "validCredentials": credentials_verification.valid_count,
            "invalidCredentials": credentials_verification.invalid_count,
            "results": credentials_verification.results,
        },
        "errors": if overall_success {
            Vec::<String>::new()
        } else {
            let mut all_errors = proof_verification.errors.clone();
            for cred_result in &credentials_verification.results {
                if !cred_result.get("isValid").and_then(Value::as_bool).unwrap_or(false) {
                    if let Some(errs) = cred_result.get("errors").and_then(Value::as_array) {
                        for err in errs {
                            if let Some(err_str) = err.as_str() {
                                all_errors.push(format!("Credential {}: {}", 
                                    cred_result.get("credentialId").and_then(Value::as_str).unwrap_or("unknown"),
                                    err_str));
                            }
                        }
                    }
                }
            }
            all_errors
        },
    });

    Ok(response.to_string())
}

struct ProofVerificationResult {
    is_valid: bool,
    verification_method: Option<String>,
    errors: Vec<String>,
}

fn verify_presentation_proof(presentation: &Value, _holder_did: &str) -> Result<ProofVerificationResult, Status> {
    let proof = match presentation.get("proof") {
        Some(Value::Object(map)) => map.clone(),
        _ => {
            return Ok(ProofVerificationResult {
                is_valid: false,
                verification_method: None,
                errors: vec!["Presentation proof is missing or malformed".to_string()],
            });
        }
    };

    // Check proof purpose
    let proof_purpose = proof.get("proofPurpose").and_then(Value::as_str).unwrap_or_default();
    if proof_purpose != "authentication" {
        return Ok(ProofVerificationResult {
            is_valid: false,
            verification_method: None,
            errors: vec![format!("Invalid proof purpose: expected 'authentication', got '{}'", proof_purpose)],
        });
    }

    // Extract proof values
    let public_key_multibase = proof
        .get("publicKeyMultibase")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let proof_value = proof
        .get("proofValue")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let verification_method = proof
        .get("verificationMethod")
        .and_then(Value::as_str)
        .map(String::from);

    if public_key_multibase.is_empty() || proof_value.is_empty() {
        return Ok(ProofVerificationResult {
            is_valid: false,
            verification_method: verification_method.clone(),
            errors: vec!["Presentation proof missing publicKeyMultibase or proofValue".to_string()],
        });
    }

    // Decode keys
    let public_key_bytes = match bs58::decode(public_key_multibase.trim_start_matches('z')).into_vec() {
        Ok(bytes) => bytes,
        Err(e) => {
            return Ok(ProofVerificationResult {
                is_valid: false,
                verification_method,
                errors: vec![format!("Invalid public key multibase: {}", e)],
            });
        }
    };

    let signature_bytes = match bs58::decode(proof_value.trim_start_matches('z')).into_vec() {
        Ok(bytes) => bytes,
        Err(e) => {
            return Ok(ProofVerificationResult {
                is_valid: false,
                verification_method,
                errors: vec![format!("Invalid proof value: {}", e)],
            });
        }
    };

    // Parse verifying key and signature
    let verifying_key = match VerifyingKey::from_bytes(
        &public_key_bytes.try_into().map_err(|_| Status::invalid_argument("Public key must be 32 bytes"))?
    ) {
        Ok(key) => key,
        Err(e) => {
            return Ok(ProofVerificationResult {
                is_valid: false,
                verification_method,
                errors: vec![format!("Failed to parse public key: {}", e)],
            });
        }
    };

    let signature_bytes_array: [u8; 64] = signature_bytes.try_into()
        .map_err(|_| Status::invalid_argument("Signature must be 64 bytes"))?;
    let signature = Signature::from_bytes(&signature_bytes_array);

    // Create presentation data without proof for canonicalization
    let mut presentation_without_proof = presentation.clone();
    if let Value::Object(ref mut obj) = presentation_without_proof {
        obj.remove("proof");
    }

    // Verify signature
    let canonical = canonicalize_json(&presentation_without_proof);
    match verifying_key.verify(canonical.as_bytes(), &signature) {
        Ok(_) => Ok(ProofVerificationResult {
            is_valid: true,
            verification_method,
            errors: vec![],
        }),
        Err(e) => Ok(ProofVerificationResult {
            is_valid: false,
            verification_method,
            errors: vec![format!("Presentation signature verification failed: {}", e)],
        }),
    }
}

struct CredentialsVerificationResult {
    total_count: usize,
    valid_count: usize,
    invalid_count: usize,
    all_valid: bool,
    results: Vec<Value>,
}

fn verify_presentation_credentials(presentation: &Value) -> Result<CredentialsVerificationResult, Status> {
    let verifiable_credential = presentation.get("verifiableCredential");

    let credentials: Vec<Value> = match verifiable_credential {
        Some(Value::Array(arr)) => arr.clone(),
        Some(Value::Object(obj)) => vec![Value::Object(obj.clone())],
        Some(other) => {
            return Ok(CredentialsVerificationResult {
                total_count: 0,
                valid_count: 0,
                invalid_count: 0,
                all_valid: false,
                results: vec![serde_json::json!({
                    "credentialId": "unknown",
                    "isValid": false,
                    "errors": [format!("Unexpected credential format: {}", other)],
                })],
            });
        }
        None => vec![],
    };

    let total_count = credentials.len();
    let mut valid_count = 0;
    let mut invalid_count = 0;
    let mut results = Vec::new();

    for (idx, credential) in credentials.iter().enumerate() {
        let fallback_id = format!("credential-{}", idx);
        let credential_id = credential
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or(&fallback_id);

        let credential_json = match serde_json::to_string(credential) {
            Ok(json) => json,
            Err(e) => {
                invalid_count += 1;
                results.push(serde_json::json!({
                    "credentialId": credential_id,
                    "isValid": false,
                    "errors": [format!("Failed to serialize credential: {}", e)],
                }));
                continue;
            }
        };

        match verify_signed_credential(&credential_json) {
            Ok(verification_result) => {
                let result_value: Value = serde_json::from_str(&verification_result)
                    .unwrap_or_else(|_| serde_json::json!({"success": false}));
                
                let is_valid = result_value.get("success").and_then(Value::as_bool).unwrap_or(false);
                
                if is_valid {
                    valid_count += 1;
                } else {
                    invalid_count += 1;
                }

                results.push(serde_json::json!({
                    "credentialId": credential_id,
                    "isValid": is_valid,
                    "verificationResult": result_value,
                }));
            }
            Err(e) => {
                invalid_count += 1;
                results.push(serde_json::json!({
                    "credentialId": credential_id,
                    "isValid": false,
                    "errors": [format!("Verification error: {}", e)],
                }));
            }
        }
    }

    let all_valid = invalid_count == 0 && total_count > 0;

    Ok(CredentialsVerificationResult {
        total_count,
        valid_count,
        invalid_count,
        all_valid,
        results,
    })
}

#[tonic::async_trait]
impl CryptoEngine for CryptoEngineService {
    async fn sign_credential(
        &self,
        request: Request<SignCredentialRequest>,
    ) -> Result<Response<SignCredentialResponse>, Status> {
        let payload = request.into_inner();
        let signed = sign_credential_json(&payload)?;

        Ok(Response::new(SignCredentialResponse {
            success: true,
            signed_credential_json: signed,
            errors: vec![],
        }))
    }

    async fn verify_credential(
        &self,
        request: Request<VerifyCredentialRequest>,
    ) -> Result<Response<VerifyCredentialResponse>, Status> {
        let payload = request.into_inner();
        let result = verify_signed_credential(&payload.verification_input_json)?;
        let success = serde_json::from_str::<Value>(&result)
            .ok()
            .and_then(|value| value.get("success").and_then(Value::as_bool))
            .unwrap_or(false);

        Ok(Response::new(VerifyCredentialResponse {
            success,
            verification_result_json: result,
            errors: vec![],
        }))
    }

    async fn verify_presentation(
        &self,
        request: Request<VerifyPresentationRequest>,
    ) -> Result<Response<VerifyPresentationResponse>, Status> {
        let payload = request.into_inner();
        let result = verify_signed_presentation(&payload.verification_input_json)?;
        let success = serde_json::from_str::<Value>(&result)
            .ok()
            .and_then(|value| value.get("success").and_then(Value::as_bool))
            .unwrap_or(false);

        Ok(Response::new(VerifyPresentationResponse {
            success,
            verification_result_json: result,
            errors: vec![],
        }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = "0.0.0.0:50051".parse()?;
    let service = CryptoEngineService::default();

    Server::builder()
        .add_service(CryptoEngineServer::new(service))
        .serve(address)
        .await?;

    Ok(())
}
