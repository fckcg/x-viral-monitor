XVM Worker local secrets
========================

This directory is ignored by git.

- `xvm-entitlement-private-key.jwk`: ECDSA P-256 private key. Paste the full
  file contents into Cloudflare Secret `ENTITLEMENT_SIGNING_PRIVATE_JWK`.
- `worker-secrets.json`: input for `wrangler secret bulk`; includes
  `CREEM_API_KEY` and `ENTITLEMENT_SIGNING_PRIVATE_JWK`.
- `upload-to-worker.ps1`: uploads secrets and deploys `worker/wrangler.toml`.

Never commit private keys or Creem API keys.
