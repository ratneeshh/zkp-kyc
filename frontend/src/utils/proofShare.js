import QRCode from "qrcode";

// Encode proof into a shareable URL
export const encodeProofToUrl = (proof, publicSignals, type = "age", extra = {}) => {
  const payload = { proof, publicSignals, type, issuedAt: Date.now(), ...extra };
  const encoded = btoa(JSON.stringify(payload));
  return `${window.location.origin}/verifier?proof=${encoded}`;
};

// Decode proof from URL
export const decodeProofFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("proof");
  if (!encoded) return null;
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
};

// Generate QR code as data URL
export const generateQRCode = async (url) => {
  return await QRCode.toDataURL(url, {
    width: 280,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
  });
};