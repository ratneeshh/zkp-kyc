import { useState } from "react";
import { useZKProof } from "../hooks/useZKProof";
import { validateAadhaar, formatAadhaar } from "../utils/aadhaarValidator";
import { createProofQR } from "../utils/proofShare";

const TEST_NUMBERS = [
  { n: "2200 0000 0004", label: "Adult (age 30) ✅" },
  { n: "2200 0000 1102", label: "Minor (age 15) ❌" },
  { n: "2200 0000 1490", label: "Adult (age 26) ✅" },
];

export default function AadhaarVerify() {
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [dob, setDob] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("idle"); // idle | sending_otp | otp_sent | otp_verified | proving | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { generateAgeProof } = useZKProof();

  const validation = validateAadhaar(aadhaarInput);
  const isValid = validation.valid;

  const hashAadhaar = async (num) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(num));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSendOtp = async () => {
    setError(null);
    setStep("sending_otp");
    try {
      const hash = await hashAadhaar(aadhaarInput.replace(/\s/g, ""));
      const res = await fetch("http://localhost:4000/api/uidai/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarHash: hash }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp_sent");
      } else {
        setError(data.error || "Aadhaar not found in registry");
        setStep("idle");
      }
    } catch {
      setError("Could not reach UIDAI service");
      setStep("idle");
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    try {
      const hash = await hashAadhaar(aadhaarInput.replace(/\s/g, ""));
      const res = await fetch("http://localhost:4000/api/uidai/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarHash: hash, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setDob(data.dob || ""); // auto-fill DOB from registry
        setStep("otp_verified");
      } else {
        setError("Invalid OTP");
      }
    } catch {
      setError("OTP verification failed");
    }
  };

  const handleGenerateProof = async () => {
    setError(null);
    setStep("proving");
    try {
      const date = new Date(dob);
      const proofResult = await generateAgeProof(
        date.getFullYear(), date.getMonth() + 1, date.getDate()
      );
      const hash = await hashAadhaar(aadhaarInput.replace(/\s/g, ""));
      const { url, qrDataUrl, proofCode } = await createProofQR(
        proofResult.proof, proofResult.publicSignals, "kyc", { aadhaarHash: hash }
      );
      setResult({ proofUrl: url, qrDataUrl, proofCode, timeTaken: proofResult.timeTaken });
      setStep("done");
    } catch (err) {
      setError(err.message);
      setStep("otp_verified");
    }
  };

  const reset = () => {
    setStep("idle"); setResult(null); setAadhaarInput("");
    setDob(""); setOtp(""); setError(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.badge}>AADHAAR KYC — ZERO KNOWLEDGE</span>
          <h1 style={styles.title}>Identity Verification</h1>
          <p style={styles.subtitle}>Verify Aadhaar and age — no PII leaves your device</p>
        </div>

        {/* Test numbers */}
        <div style={styles.testBox}>
          <p style={styles.testTitle}>Demo — test Aadhaar numbers:</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {TEST_NUMBERS.map(({ n, label }) => (
              <div key={n} style={{ textAlign: "center" }}>
                <button onClick={() => { setAadhaarInput(n); setDob(""); setOtp(""); setStep("idle"); setError(null); }}
                  style={{ ...styles.chip, borderColor: label.includes("✅") ? "#86efac" : "#fca5a5", background: label.includes("✅") ? "#f0fdf4" : "#fef2f2" }}>
                  {n}
                </button>
                <p style={{ fontSize: "10px", margin: "2px 0 0", color: label.includes("✅") ? "#057a55" : "#c81e1e", fontWeight: "600" }}>{label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#92400e", margin: "8px 0 0" }}>
            Click number → Send OTP → check terminal for OTP → DOB auto-fills after OTP
          </p>
        </div>

        {/* STEP 1: Aadhaar input */}
        {step === "idle" && (
          <div>
            <div style={styles.group}>
              <label style={styles.label}>Aadhaar Number</label>
              <input
                value={aadhaarInput}
                onChange={e => setAadhaarInput(formatAadhaar(e.target.value))}
                placeholder="XXXX XXXX XXXX"
                style={{ ...styles.input, borderColor: aadhaarInput ? (isValid ? "#057a55" : "#c81e1e") : "#d1d5db" }}
              />
              {aadhaarInput && (
                <p style={{ fontSize: "12px", margin: "4px 0 0", color: isValid ? "#057a55" : "#c81e1e" }}>
                  {isValid ? "✓ Valid Aadhaar (Verhoeff checksum passed)" : `✗ ${validation.error}`}
                </p>
              )}
            </div>
            <button onClick={handleSendOtp} disabled={!isValid}
              style={{ ...styles.btn, opacity: isValid ? 1 : 0.4 }}>
              📱 Send OTP to registered mobile
            </button>
          </div>
        )}

        {step === "sending_otp" && (
          <div style={styles.statusBox}>⏳ Sending OTP to registered mobile...</div>
        )}

        {/* STEP 2: OTP input */}
        {step === "otp_sent" && (
          <div>
            <div style={styles.sentNote}>✅ OTP sent — check your terminal for the OTP code</div>
            <div style={styles.group}>
              <label style={styles.label}>Enter OTP</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  placeholder="6-digit OTP"
                  maxLength={6}
                  style={{ ...styles.input, fontFamily: "monospace", letterSpacing: "6px", flex: 1 }}
                />
                <button onClick={handleVerifyOtp} disabled={otp.length !== 6}
                  style={{ ...styles.btn, width: "auto", padding: "10px 20px", opacity: otp.length === 6 ? 1 : 0.4 }}>
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DOB auto-filled, generate proof */}
        {step === "otp_verified" && (
          <div>
            <div style={styles.sentNote}>✅ OTP verified — identity confirmed</div>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>Date of Birth (from Aadhaar registry)</p>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0, fontFamily: "monospace" }}>{dob}</p>
              <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0" }}>Auto-filled — not entered by user</p>
            </div>
            <button onClick={handleGenerateProof} style={styles.btn}>
              Generate ZK Proof →
            </button>
          </div>
        )}

        {step === "proving" && (
          <div style={styles.statusBox}>⏳ Generating Groth16 ZK Proof in browser...</div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>❌ {error}</div>
        )}

        {/* DONE: QR + proof code */}
        {step === "done" && result && (
          <div>
            <div style={styles.successBox}>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#057a55", margin: "0 0 4px" }}>
                ✅ KYC Proof Generated — {result.timeTaken}s
              </p>
              <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>
                Zero PII transmitted. Share proof with verifier.
              </p>
            </div>

            <div style={styles.qrBox}>
              <p style={styles.qrTitle}>📱 Verifier scans this QR code</p>
              <img src={result.qrDataUrl} alt="QR" style={{ width: "200px", height: "200px", display: "block", margin: "0 auto" }} />
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "10px 0 0", textAlign: "center" }}>
                Verifier learns only: <strong>PASS</strong> or <strong>FAIL</strong>
              </p>
            </div>

            <div style={styles.codeBox}>
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 8px" }}>Or share proof code:</p>
              <textarea readOnly value={result.proofCode} rows={3}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "11px", fontFamily: "monospace", background: "#fff", boxSizing: "border-box", resize: "none" }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => navigator.clipboard.writeText(result.proofCode)}
                  style={{ padding: "7px 14px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                  Copy Code
                </button>
                <a href={result.proofUrl} target="_blank" rel="noreferrer"
                  style={{ padding: "7px 14px", background: "#057a55", color: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>
                  Open Verifier →
                </a>
              </div>
            </div>

            <button onClick={reset} style={styles.resetBtn}>Start New Verification</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "60px 20px 20px" },
  card: { background: "#fff", borderRadius: "8px", padding: "36px", maxWidth: "500px", width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" },
  header: { marginBottom: "20px", paddingBottom: "18px", borderBottom: "2px solid #1a56db" },
  badge: { display: "inline-block", background: "#1a56db", color: "#fff", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", padding: "3px 8px", borderRadius: "4px", marginBottom: "10px" },
  title: { fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: "13px", color: "#6b7280", margin: 0 },
  testBox: { background: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", padding: "14px", marginBottom: "20px" },
  testTitle: { fontSize: "12px", fontWeight: "600", color: "#92400e", margin: "0 0 10px" },
  chip: { padding: "5px 12px", border: "1px solid", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", cursor: "pointer", fontWeight: "600" },
  group: { marginBottom: "14px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "15px", color: "#111827", background: "#fff", boxSizing: "border-box" },
  btn: { width: "100%", padding: "12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "12px" },
  statusBox: { background: "#ebf5ff", border: "1px solid #c3ddfd", borderRadius: "6px", padding: "14px", textAlign: "center", fontSize: "14px", color: "#1e429f", fontWeight: "600", marginBottom: "14px" },
  sentNote: { background: "#f3faf7", border: "1px solid #bcf0da", borderRadius: "6px", padding: "10px 14px", fontSize: "13px", color: "#057a55", fontWeight: "600", marginBottom: "14px" },
  errorBox: { background: "#fdf2f2", border: "1px solid #fde8e8", borderRadius: "6px", padding: "12px", fontSize: "13px", color: "#c81e1e", marginBottom: "14px" },
  successBox: { background: "#f3faf7", border: "1px solid #bcf0da", borderRadius: "6px", padding: "14px", marginBottom: "16px" },
  qrBox: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", marginBottom: "16px" },
  qrTitle: { fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 14px", textAlign: "center" },
  codeBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "14px", marginBottom: "16px" },
  resetBtn: { width: "100%", padding: "11px", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
};