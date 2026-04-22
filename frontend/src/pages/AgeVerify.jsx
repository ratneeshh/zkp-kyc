import { useState } from "react";
import { useZKProof } from "../hooks/useZKProof";
import { encodeProofToUrl, generateQRCode } from "../utils/proofShare";

export default function AgeVerify() {
  const [dob, setDob] = useState("");
  const [step, setStep] = useState("idle"); // idle | proving | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const { generateAgeProof, loading } = useZKProof();

  const handleGenerate = async () => {
    if (!dob) return;
    setError(null);
    setStep("proving");
    try {
      const date = new Date(dob);
      const proofResult = await generateAgeProof(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );

      const proofUrl = encodeProofToUrl(proofResult.proof, proofResult.publicSignals, "age");
      const qrDataUrl = await generateQRCode(proofUrl);
      const proofCode = btoa(JSON.stringify({
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
        type: "age",
        issuedAt: Date.now(),
      }));

      setResult({ proofUrl, qrDataUrl, proofCode, timeTaken: proofResult.timeTaken });
      setStep("done");
    } catch (err) {
      setError(err.message);
      setStep("idle");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.proofCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setStep("idle"); setResult(null); setDob(""); setError(null); };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.badge}>PRIVACY-PRESERVING KYC</span>
          <h1 style={styles.title}>Age Verification</h1>
          <p style={styles.subtitle}>Prove you are 18+ without revealing your date of birth</p>
        </div>

        <div style={styles.infoBox}>
          <p style={{ fontSize: "13px", color: "#1e429f", margin: 0 }}>
            🔐 Your date of birth <strong>never leaves your browser.</strong> Only a cryptographic proof is generated — share it with any verifier.
          </p>
        </div>

        {step !== "done" && (
          <>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter your Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={styles.input}
                max={new Date().toISOString().split("T")[0]}
                disabled={step === "proving"}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!dob || step === "proving"}
              style={{ ...styles.button, opacity: !dob || step === "proving" ? 0.5 : 1 }}
            >
              {step === "proving" ? "⏳ Generating ZK Proof in browser..." : "Generate Proof →"}
            </button>
          </>
        )}

        {error && (
          <div style={styles.errorBox}>
            <p style={{ color: "#c81e1e", fontSize: "13px", margin: 0 }}>❌ {error}</p>
          </div>
        )}

        {step === "done" && result && (
          <div>
            <div style={{ background: "#f3faf7", border: "1px solid #bcf0da", borderRadius: "6px", padding: "14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#057a55", margin: "0 0 4px" }}>
                ✅ KYC Proof Generated — {result.timeTaken}s
              </p>
              <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>
                Aadhaar and age proved. Zero PII transmitted. Share proof with verifier.
              </p>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", textAlign: "center", marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 14px" }}>
                📱 Verifier scans this QR code
              </p>
              <img src={result.qrDataUrl} alt="Proof QR" style={{ width: "200px", height: "200px", display: "block", margin: "0 auto" }} />
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "12px 0 0" }}>
                Verifier learns only: <strong>PASS</strong> or <strong>FAIL</strong> — nothing else
              </p>
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 8px" }}>Or share the proof code:</p>
              <textarea
                readOnly value={result.proofCode} rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "11px", fontFamily: "monospace", color: "#374151", background: "#fff", boxSizing: "border-box", resize: "none" }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => navigator.clipboard.writeText(result.proofCode)}
                  style={{ padding: "7px 16px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                >Copy Code</button>
                <a href={result.proofUrl} target="_blank" rel="noreferrer"
                  style={{ padding: "7px 16px", background: "#057a55", color: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "600", textDecoration: "none", display: "inline-block" }}
                >Open Verifier Portal →</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivacyRow({ icon, text, green }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "12px" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: green ? "#057a55" : "#c81e1e", fontWeight: green ? "600" : "400" }}>{text}</span>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "60px 20px 20px" },
  card: { background: "#fff", borderRadius: "8px", padding: "36px", maxWidth: "480px", width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" },
  header: { marginBottom: "20px", paddingBottom: "18px", borderBottom: "2px solid #1a56db" },
  badge: { display: "inline-block", background: "#1a56db", color: "#fff", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", padding: "3px 8px", borderRadius: "4px", marginBottom: "10px" },
  title: { fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: "13px", color: "#6b7280", margin: 0 },
  infoBox: { background: "#ebf5ff", border: "1px solid #c3ddfd", borderRadius: "6px", padding: "12px 14px", marginBottom: "20px" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", color: "#111827", background: "#fff", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "16px" },
  errorBox: { background: "#fdf2f2", border: "1px solid #fde8e8", borderRadius: "6px", padding: "12px", marginBottom: "14px" },
  successBox: { background: "#f3faf7", border: "1px solid #bcf0da", borderRadius: "6px", padding: "14px", marginBottom: "16px" },
  qrBox: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", textAlign: "center", marginBottom: "16px" },
  qrTitle: { fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 14px" },
  qrImg: { width: "200px", height: "200px", display: "block", margin: "0 auto" },
  qrSub: { fontSize: "12px", color: "#6b7280", margin: "12px 0 0" },
  codeBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "14px", marginBottom: "16px" },
  codeTitle: { fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 8px" },
  textarea: { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "11px", fontFamily: "monospace", color: "#374151", background: "#fff", boxSizing: "border-box", resize: "none" },
  codeActions: { display: "flex", gap: "8px", marginTop: "8px" },
  copyBtn: { padding: "7px 16px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  verifierLink: { padding: "7px 16px", background: "#057a55", color: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "600", textDecoration: "none", display: "inline-block" },
  privacyNote: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px 14px", marginBottom: "16px" },
  privacyTitle: { fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 8px" },
  resetBtn: { width: "100%", padding: "11px", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
};