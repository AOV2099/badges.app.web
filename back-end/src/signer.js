import { SignJWT, jwtVerify } from "jose";
import { issuer } from "./issuer.js";

const signingSecret = process.env.BADGE_SIGNING_SECRET || "super-secret-local-key-change-me";
const secret = new TextEncoder().encode(signingSecret);

export async function signCredential(credential) {
  return await new SignJWT({ vc: credential })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(credential.issuer.id)
    .setSubject(credential.credentialSubject.id)
    .setJti(credential.id)
    .sign(secret);
}

export async function verifyCredentialJwt(token) {
  const { payload } = await jwtVerify(token, secret, {
    issuer: issuer.id
  });
  return payload;
}
