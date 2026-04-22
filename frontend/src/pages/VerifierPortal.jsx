import { useState, useEffect } from "react";
import { fetchProofById } from "../utils/proofShare";

const TYPE_LABELS = {
  age: { title: "Age Verification (18+)", endpoint: "/api/verify/age", icon: "🎂" },
  student: { title: "Student Enrollment", endpoint: "/api/verify/student", icon: "🎓" },
  kyc: { title: "Aadhaar KYC", endpoint: "/api/verify/kyc", icon: "🪪" },
};

export default function VerifierPortal() {
  const [status, setStatus] = useState("idle"); // idle | verifying | done | error
  const [proofData, setProofData] = useState(null);
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      fetchProofById(id).then(data => {
        if (data) {
          setProofData(data);
          verifyProof(data);
        } else {
          setError("Proof not found or expired (proofs expire after 30 minutes)");
        }
      });
    }
  }, []);

  const verifyProof = async (data) => {
    setStatus("verifying");
    setError(null);
    try {
      const typeInfo = TYPE_LABELS[data.type] || TYPE_LABELS.age;
      const response = await fetch(`http://localhost:4000${typeInfo.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: data.proof,
          publicSignals: data.publicSignals,
          aadhaarHash: data.aadhaarHash || "0".repeat(64),
        }),
      });
      const result = await response.json();
      setResult({ ...result, type: data.type, issuedAt: data.issuedAt });
      setStatus("done");
    } catch (err) {
      setError("Verification failed: " + err.message);
      setStatus("error");
    }
  };

  const handleManualVerify = async () => {
    const id = manualInput.trim();
    const data = await fetchProofById(id);
    if (data) {
      setProofData(data);
      verifyProof(data);
    } else {
      setError("Invalid proof ID. Proof may have expired.");
    }
  };

  const typeInfo = proofData ? (TYPE_LABELS[proofData.type] || TYPE_LABELS.age) : null;

  return (
    <div style={styles.page}>
      {/* Gov bar */}
      <div style={styles.govBar}>
        <span>🇮🇳</span>
        <span>Government of India — Digital Identity Services</span>
        <span style={{ marginLeft: "auto" }}>Verifier Portal</span>
      </div>

      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.badge}>VERIFIER PORTAL</span>
          <h1 style={styles.title}>ZKP Proof Verification</h1>
          <p style={styles.subtitle}>
            Verify a Zero-Knowledge Proof — you learn only PASS or FAIL, nothing else
          </p>
        </div>

        {/* What verifier learns */}
        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>🔒 What you learn as a verifier</p>
          <div style={styles.infoGrid}>
            <InfoItem icon="✅" text="Whether the claim is TRUE or FALSE" green />
            <InfoItem icon="📅" text="When the proof was issued" green />
            <InfoItem icon="❌" text="Prover's actual date of birth" />
            <InfoItem icon="❌" text="Prover's Aadhaar or ID number" />
            <InfoItem icon="❌" text="Any other personal information" />
          </div>
        </div>

        {/* Auto-loaded from URL */}
        {status === "verifying" && (
          <div style={styles.verifyingBox}>
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>⚙️</p>
            <p style={styles.verifyingText}>Verifying cryptographic proof...</p>
            <p style={styles.verifyingSub}>Checking Groth16 proof validity</p>
          </div>
        )}

        {/* Result */}
        {status === "done" && result && (
          <div style={{
            ...styles.resultBox,
            borderColor: result.verified ? "#057a55" : "#c81e1e",
            background: result.verified ? "#f3faf7" : "#fdf2f2",
          }}>
            <div style={styles.resultHeader}>
              <span style={{ fontSize: "40px" }}>{result.verified ? "✅" : "❌"}</span>
              <div>
                <p style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 4px", color: result.verified ? "#057a55" : "#c81e1e" }}>
                  {result.verified ? "PROOF VALID" : "PROOF INVALID"}
                </p>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                  {typeInfo?.icon} {typeInfo?.title}
                </p>
              </div>
            </div>

            <div style={styles.resultDetails}>
              <ResultRow label="Proof mathematically valid" value={result.verified ? "Yes ✓" : "No ✗"} ok={result.verified} />
              {result.ageVerified !== undefined && (
                <ResultRow label="Age 18+ proved" value={result.ageVerified ? "Yes ✓" : "No ✗"} ok={result.ageVerified} />
              )}
              {result.isAdult !== undefined && (
                <ResultRow label="Age 18+ proved" value={result.isAdult ? "Yes ✓" : "No ✗"} ok={result.isAdult} />
              )}
              {result.isEnrolled !== undefined && (
                <ResultRow label="Active enrollment" value={result.isEnrolled ? "Yes ✓" : "No ✗"} ok={result.isEnrolled} />
              )}
              {result.isTierValid !== undefined && (
                <ResultRow label="Institution tier accepted" value={result.isTierValid ? "Yes ✓" : "No ✗"} ok={result.isTierValid} />
              )}
              {result.aadhaarVerified !== undefined && (
                <ResultRow label="Aadhaar registry check" value={result.aadhaarVerified ? "Yes ✓" : "No ✗"} ok={result.aadhaarVerified} />
              )}
              <ResultRow label="PII revealed to verifier" value="None ✓" ok={true} />
              <ResultRow label="Server latency" value={`${result.latencyMs}ms`} ok={true} />
              <ResultRow label="Proof system" value="Groth16 (BN128)" ok={true} />
              {result.issuedAt && (
                <ResultRow
                  label="Proof issued at"
                  value={new Date(result.issuedAt).toLocaleString()}
                  ok={true}
                />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {(status === "error" || error) && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}

        {/* Manual paste input — shown when no URL proof */}
        {!proofData && status === "idle" && (
          <div style={styles.manualBox}>
            <p style={styles.manualTitle}>Paste Proof Code</p>
            <p style={styles.manualSub}>
              Ask the prover to share their proof code, then paste it below
            </p>
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Paste proof code here..."
              style={styles.textarea}
              rows={4}
            />
            <button
              onClick={handleManualVerify}
              disabled={!manualInput.trim()}
              style={{ ...styles.verifyBtn, opacity: manualInput.trim() ? 1 : 0.5 }}
            >
              Verify Proof →
            </button>
          </div>
        )}

        {/* Verify another */}
        {status === "done" && (
          <button onClick={() => { setStatus("idle"); setProofData(null); setResult(null); setManualInput(""); }}
            style={styles.resetBtn}>
            Verify Another Proof
          </button>
        )}

        {/* How it works */}
        <div style={styles.howBox}>
          <p style={styles.howTitle}>How Zero-Knowledge Verification works</p>
          <div style={styles.howSteps}>
            {[
              "Prover generates a Groth16 cryptographic proof in their browser",
              "Proof is shared via QR code or proof code — contains NO personal data",
              "Verifier pastes the code — server checks mathematical validity only",
              "Result: PASS or FAIL — verifier learns nothing else",
            ].map((text, i) => (
              <div key={i} style={styles.howStep}>
                <div style={styles.howNum}>{i + 1}</div>
                <p style={styles.howText}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, text, green }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: green ? "#057a55" : "#c81e1e", fontWeight: green ? "600" : "400" }}>{text}</span>
    </div>
  );
}

function ResultRow({ label, value, ok }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: "13px", color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: ok ? "#057a55" : "#c81e1e" }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", fontFamily: "system-ui, sans-serif" },
  govBar: { background: "#1a56db", color: "#fff", padding: "8px 32px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" },
  container: { maxWidth: "580px", margin: "32px auto", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "36px" },
  header: { marginBottom: "24px", paddingBottom: "18px", borderBottom: "2px solid #1a56db" },
  badge: { display: "inline-block", background: "#057a55", color: "#fff", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", padding: "3px 8px", borderRadius: "4px", marginBottom: "10px" },
  title: { fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: "13px", color: "#6b7280", margin: 0 },
  infoBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "14px", marginBottom: "20px" },
  infoTitle: { fontSize: "13px", fontWeight: "700", color: "#374151", margin: "0 0 10px" },
  infoGrid: { display: "flex", flexDirection: "column", gap: "6px" },
  verifyingBox: { textAlign: "center", padding: "32px 0" },
  verifyingText: { fontSize: "15px", fontWeight: "600", color: "#1a56db", margin: "0 0 6px" },
  verifyingSub: { fontSize: "12px", color: "#6b7280", margin: 0 },
  resultBox: { border: "2px solid", borderRadius: "8px", padding: "24px", marginBottom: "16px" },
  resultHeader: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.08)" },
  resultDetails: {},
  errorBox: { background: "#fdf2f2", border: "1px solid #fde8e8", borderRadius: "6px", padding: "12px", marginBottom: "16px" },
  errorText: { color: "#c81e1e", fontSize: "13px", margin: 0 },
  manualBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "20px", marginBottom: "20px" },
  manualTitle: { fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  manualSub: { fontSize: "12px", color: "#6b7280", margin: "0 0 14px" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", color: "#111827", background: "#fff", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" },
  verifyBtn: { width: "100%", marginTop: "10px", padding: "11px", background: "#057a55", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  resetBtn: { width: "100%", padding: "11px", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "20px" },
  howBox: { background: "#ebf5ff", border: "1px solid #c3ddfd", borderRadius: "6px", padding: "14px", marginTop: "8px" },
  howTitle: { fontSize: "13px", fontWeight: "700", color: "#1e429f", margin: "0 0 12px" },
  howSteps: { display: "flex", flexDirection: "column", gap: "8px" },
  howStep: { display: "flex", alignItems: "flex-start", gap: "10px" },
  howNum: { width: "20px", height: "20px", borderRadius: "50%", background: "#1a56db", color: "#fff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" },
  howText: { fontSize: "12px", color: "#1e429f", margin: 0 },
};