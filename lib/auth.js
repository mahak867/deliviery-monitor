const { createHmac, createHash, randomUUID } = require("crypto");

function base64Url(input) {
  const encoded = Buffer.from(input).toString("base64");
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signToken(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const body = { ...payload, iat, exp, jti: randomUUID() };
  const headerSegment = base64Url(JSON.stringify(header));
  const payloadSegment = base64Url(JSON.stringify(body));
  const signedData = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac("sha256", secret).update(signedData).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${signedData}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }
  const [headerSegment, payloadSegment, signature] = parts;
  const signedData = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = createHmac("sha256", secret).update(signedData).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (expectedSignature !== signature) {
    throw new Error("Invalid token signature");
  }
  const payloadText = Buffer.from(payloadSegment, "base64").toString("utf8");
  const payload = JSON.parse(payloadText);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) {
    throw new Error("Token expired");
  }
  return payload;
}

function normalizePhone(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+${digits.slice(1)}`;
  return String(input || "").trim();
}

function isValidIndianPhone(input) {
  const normalized = normalizePhone(input);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code, nonce) {
  return createHash("sha256").update(`${code}:${nonce}`).digest("hex");
}

module.exports = {
  signToken,
  verifyToken,
  normalizePhone,
  isValidIndianPhone,
  randomOtp,
  hashOtp
};
