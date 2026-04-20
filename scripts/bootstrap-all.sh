#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "Bootstrapping reCAPTCHA infrastructure..."
bash infrastructure/bootstrap-recaptcha/scripts/apply.sh

echo "Bootstrapping policeconduct.org infrastructure..."
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh

cat <<'EOF'

Bootstrap complete.

If this is the first domain bootstrap and Route 53 nameservers changed, update your registrar nameservers and then rerun:

  bash scripts/bootstrap-all.sh

If ACM is still pending after DNS propagation, rerunning the bootstrap is expected.
EOF
