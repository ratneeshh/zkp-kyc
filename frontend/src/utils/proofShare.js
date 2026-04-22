import QRCode from "qrcode";

// Store proof on backend, get short ID
export const storeProof = async (proof, publicSignals, type, extra = {}) => {
  const response = await fetch("http://localhost:4000/api/proof/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proof, publicSignals, type, ...extra }),
  });
  const data = await response.json();
  return data.id;
};

// Build short verifier URL from ID
export const buildVerifierUrl = (id) => {
  return `${window.location.origin}/verifier?id=${id}`;
};

// Generate QR code from short URL
export const generateQRCode = async (url) => {
  return await QRCode.toDataURL(url, {
    width: 280,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
};

// Full flow: store proof → get ID → generate QR
export const createProofQR = async (proof, publicSignals, type, extra = {}) => {
  const id = await storeProof(proof, publicSignals, type, extra);
  const url = buildVerifierUrl(id);
  const qrDataUrl = await generateQRCode(url);
  const proofCode = id; // short code instead of huge base64
  return { id, url, qrDataUrl, proofCode };
};

// Decode proof from URL (by ID — fetched from backend)
export const fetchProofById = async (id) => {
  const response = await fetch(`http://localhost:4000/api/proof/${id}`);
  if (!response.ok) return null;
  return await response.json();
};

// Legacy support
export const encodeProofToUrl = (proof, publicSignals, type, extra = {}) => {
  return buildVerifierUrl("pending");
};