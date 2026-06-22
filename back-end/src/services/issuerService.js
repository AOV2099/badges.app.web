import { issuer } from "../issuer.js";
import { getKeyId, getPublicJwk } from "../signer.js";

export async function getPublicIssuerProfile() {
  const publicJwk = await getPublicJwk();

  return {
    ...issuer,
    publicKey: [
      {
        id: getKeyId(),
        type: "JsonWebKey2020",
        controller: issuer.id,
        publicKeyJwk: publicJwk
      }
    ],
    verificationMethod: [
      {
        id: getKeyId(),
        type: "JsonWebKey2020",
        controller: issuer.id,
        publicKeyJwk: publicJwk
      }
    ],
    assertionMethod: [getKeyId()]
  };
}
