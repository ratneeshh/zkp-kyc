import { useState } from "react";
import { useZKProof } from "../hooks/useZKProof";

export default function AgeVerify() {
  const [dob, setDob] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const { generateAgeProof, proof, loading, error } = useZKProof();

  const handleVerify = async () => {
    if (!dob) return;
    const date = new Date(dob);
    try {
      const result = await generateAgeProof(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );
      setVerifying(true);
      const response = await fetch("http://localhost:4000/api/verify/age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: result.proof,
          publicSignals: result.publicSignals,
        }),
      });
      const data = await response.json();
      setVerificationResult({ ...data, timeTaken: result.timeTaken });
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>PRIVACY-PRESERVING KYC</div>
          <h1 style={styles.title}>Age Verification</h1>
          <p style={styles.subtitle}>
            Prove you are 18+ without revealing your date of birth
          </p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            🔐 Your date of birth <strong>never leaves your browser.</strong>{" "}
            Only a cryptographic proof is sent to the server.
          </p>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Enter your Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => { setDob(e.target.value); setVerificationResult(null); }}
            style={styles.input}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={!dob || loading || verifying}
          style={{
            ...styles.button,
            opacity: !dob || loading || verifying ? 0.5 : 1,
            cursor: !dob || loading || verifying ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Generating ZK Proof..." : verifying ? "🔄 Verifying..." : "Generate & Verify Proof"}
        </button>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>❌ Error: {error}</p>
          </div>
        )}

        {proof && (
          <div style={styles.proofBox}>
            <p style={styles.proofTitle}>✅ Proof Generated in Browser</p>
            <p style={styles.proofMeta}>Time taken: <strong>{proof.timeTaken}s</strong></p>
            <p style={styles.proofMeta}>Your DOB: <strong>never transmitted</strong> ✓</p>
          </div>
        )}

        {verificationResult && (
          <div style={{
            ...styles.resultBox,
            borderColor: verificationResult.verified ? "#22c55e" : "#ef4444",
            background: verificationResult.verified ? "#f0fdf4" : "#fef2f2",
          }}>
            <p style={styles.resultTitle}>
              {verificationResult.verified ? "✅ Age Verified — User is 18+" : "❌ Verification Failed"}
            </p>
            <p style={styles.resultMeta}>Proof verified by server: <strong>{verificationResult.verified ? "VALID" : "INVALID"}</strong></p>
            <p style={styles.resultMeta}>PII sent to server: <strong>None</strong> ✓</p>
            <p style={styles.resultMeta}>Proof generation time: <strong>{proof.timeTaken}s</strong></p>
            <p style={styles.resultMeta}>Server latency: <strong>{verificationResult.latencyMs}ms</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "20px" },
  card: { background: "#ffffff", borderRadius: "16px", padding: "40px", maxWidth: "520px", width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" },
  header: { marginBottom: "24px" },
  badge: { display: "inline-block", background: "#ede9fe", color: "#6d28d9", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", padding: "4px 10px", borderRadius: "6px", marginBottom: "12px" },
  title: { fontSize: "26px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px 16px", marginBottom: "24px" },
  infoText: { fontSize: "13px", color: "#1e40af", margin: 0 },
  inputGroup: { marginBottom: "20px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px", color: "#111827", background: "#ffffff", boxSizing: "border-box" },
  button: { width: "100%", padding: "13px", background: "#6d28d9", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", marginBottom: "20px" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" },
  errorText: { color: "#dc2626", fontSize: "13px", margin: 0 },
  proofBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" },
  proofTitle: { fontSize: "14px", fontWeight: "600", color: "#15803d", margin: "0 0 8px" },
  proofMeta: { fontSize: "12px", color: "#166534", margin: "4px 0" },
  resultBox: { border: "2px solid", borderRadius: "10px", padding: "16px" },
  resultTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 10px" },
  resultMeta: { fontSize: "13px", color: "#374151", margin: "4px 0" },
};