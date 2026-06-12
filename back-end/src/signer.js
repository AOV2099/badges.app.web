import { SignJWT, exportJWK, jwtVerify } from "jose";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createPrivateKey, createPublicKey, generateKeyPairSync } from "crypto";
import { fileURLToPath } from "url";
import { issuer } from "./issuer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultKeyPath = path.join(__dirname, "../data/signing-private-key.pem");
const privateKeyPath = process.env.BADGE_PRIVATE_KEY_PATH || defaultKeyPath;
const keyId = process.env.BADGE_KEY_ID || `${issuer.id}/keys/1`;

function readPrivateKeyPem() {
  if (process.env.BADGE_PRIVATE_KEY_PEM) {
    return process.env.BADGE_PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
  }

  if (existsSync(privateKeyPath)) {
    return readFileSync(privateKeyPath, "utf-8");
  }

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001
  });
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem"
  });

  mkdirSync(path.dirname(privateKeyPath), { recursive: true });
  writeFileSync(privateKeyPath, privateKeyPem, { mode: 0o600 });

  return privateKeyPem;
}

const privateKey = createPrivateKey(readPrivateKeyPem());
const publicKey = createPublicKey(privateKey);
let publicJwk;

export function getKeyId() {
  return keyId;
}

export async function getPublicJwk() {
  if (!publicJwk) {
    publicJwk = {
      ...(await exportJWK(publicKey)),
      kid: keyId,
      alg: "RS256",
      use: "sig"
    };
  }

  return publicJwk;
}

export async function signCredential(credential) {
  const publicJwk = await getPublicJwk();

  return await new SignJWT({ vc: credential })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", jwk: publicJwk })
    .setIssuedAt()
    .setIssuer(credential.issuer.id)
    .setSubject(credential.credentialSubject.id)
    .setJti(credential.id)
    .sign(privateKey);
}

export async function verifyCredentialJwt(token) {
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: issuer.id,
    algorithms: ["RS256"]
  });

  return payload;
}
