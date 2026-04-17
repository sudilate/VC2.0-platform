fn main() {
    tonic_build::configure()
        .build_server(true)
        .compile_protos(&["proto/crypto_engine.proto"], &["proto"])
        .expect("failed to compile protobuf definitions");
}
