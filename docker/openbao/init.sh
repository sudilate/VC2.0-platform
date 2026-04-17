#!/bin/sh
set -eu

bao secrets enable transit || true
bao write -f transit/keys/org_dev_default || true

echo "OpenBao transit engine ready"
