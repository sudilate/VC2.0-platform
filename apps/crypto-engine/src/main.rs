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

#[tonic::async_trait]
impl CryptoEngine for CryptoEngineService {
    async fn sign_credential(
        &self,
        request: Request<SignCredentialRequest>,
    ) -> Result<Response<SignCredentialResponse>, Status> {
        let payload = request.into_inner();

        Ok(Response::new(SignCredentialResponse {
            success: false,
            signed_credential_json: String::new(),
            errors: vec![format!(
                "SignCredential is not implemented yet for organization {} in {}",
                payload.organization_id, payload.environment
            )],
        }))
    }

    async fn verify_credential(
        &self,
        request: Request<VerifyCredentialRequest>,
    ) -> Result<Response<VerifyCredentialResponse>, Status> {
        let payload = request.into_inner();

        Ok(Response::new(VerifyCredentialResponse {
            success: false,
            verification_result_json: String::new(),
            errors: vec![format!(
                "VerifyCredential is not implemented yet for organization {} in {}",
                payload.organization_id, payload.environment
            )],
        }))
    }

    async fn verify_presentation(
        &self,
        request: Request<VerifyPresentationRequest>,
    ) -> Result<Response<VerifyPresentationResponse>, Status> {
        let payload = request.into_inner();

        Ok(Response::new(VerifyPresentationResponse {
            success: false,
            verification_result_json: String::new(),
            errors: vec![format!(
                "VerifyPresentation is not implemented yet for organization {} in {}",
                payload.organization_id, payload.environment
            )],
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
