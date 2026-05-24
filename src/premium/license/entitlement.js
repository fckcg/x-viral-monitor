// === XVM signed entitlement verifier (CommonJS + globalThis dual-mode) ===
//
// The Worker signs short-lived entitlement payloads with a private ECDSA
// P-256 key. The extension only embeds the public key and verifies returned
// envelopes before storing or refreshing a Pro license record.

(function (root) {
  'use strict';

  const ENTITLEMENT_VERIFY_PUBLIC_JWK = Object.freeze({
    kty: 'EC',
    crv: 'P-256',
    x: 'xYDV4pnWrgL64aiIxdGNKunPWysBg-DBERv_nATObXY',
    y: 'GuBxbvz-DfMUl9cymlskN2IYRWTX3oLS_sGJVvA-oTg',
    ext: true,
    key_ops: ['verify'],
  });

  async function verifyEntitlementEnvelope(envelope, expected, isExpectedProduct) {
    if (!envelope?.entitlement_payload || !envelope?.entitlement_sig) {
      return { ok: false, error: 'missing_entitlement' };
    }
    return verifyEntitlement(envelope.entitlement_payload, envelope.entitlement_sig, expected, isExpectedProduct);
  }

  async function verifyEntitlement(payload, signature, expected, isExpectedProduct) {
    const validSig = await verifyEcdsaSignature(payload, signature);
    if (!validSig) return { ok: false, error: 'bad_entitlement_signature' };
    let entitlement;
    try {
      entitlement = JSON.parse(base64UrlDecode(payload));
    } catch (e) {
      return { ok: false, error: 'bad_entitlement_payload', detail: String(e?.message || e) };
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Number(entitlement.exp || 0) <= nowSec) return { ok: false, error: 'entitlement_expired', entitlement };
    if (entitlement.status && entitlement.status !== 'active') return { ok: false, error: 'entitlement_inactive', entitlement };
    if (typeof isExpectedProduct === 'function') {
      if (!isExpectedProduct(entitlement.product_id) || entitlement.product_id !== expected.productId) {
        return { ok: false, error: 'wrong_product', entitlement };
      }
    } else if (entitlement.product_id !== expected.productId) {
      return { ok: false, error: 'wrong_product', entitlement };
    }
    if (expected.instanceId && entitlement.instance_id !== expected.instanceId) {
      return { ok: false, error: 'wrong_instance', entitlement };
    }
    const keyHash = await sha256(expected.key || '');
    if (entitlement.license_key_hash !== keyHash) {
      return { ok: false, error: 'wrong_license_key', entitlement };
    }
    return { ok: true, entitlement };
  }

  async function verifyEcdsaSignature(payload, signature) {
    const key = await crypto.subtle.importKey(
      'jwk',
      ENTITLEMENT_VERIFY_PUBLIC_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
  }

  async function sha256(value) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function base64UrlDecode(value) {
    return new TextDecoder().decode(base64UrlToBytes(value));
  }

  function base64UrlToBytes(value) {
    const raw = String(value || '');
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(raw.length / 4) * 4, '=');
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  const api = {
    ENTITLEMENT_VERIFY_PUBLIC_JWK,
    verifyEntitlement,
    verifyEntitlementEnvelope,
    sha256,
    base64UrlDecode,
    base64UrlToBytes,
  };

  if (root) root.__xvmEntitlement = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
