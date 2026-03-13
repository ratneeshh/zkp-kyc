import { useState } from "react";
import { useZKProof } from "../hooks/useZKProof";
import { validateAadhaar, formatAadhaar, TEST_AADHAAR_NUMBERS } from "../utils/aadhaarValidator";

export default function AadhaarVerify() {
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [dob, setDob] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [step, setStep] = useState("idle"); // idle | sending_otp | otp_sent | proving | verifying | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [serverOtp, setServerOtp] = useState(null);
  const { generateAgeProof, loading } = useZKProof();

  const aadhaarValidation = validateAadhaar(aadhaarInput);
  const isAadhaarValid = aadhaarValidation.valid;

  // Step 1: Send OTP to mock UIDAI
  const handleSendOtp = async () => {
    setError(null);
    setStep("sending_otp");
    try {
      const response = await fetch("http://localhost:4000/api/uidai/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaarHash: await hashAadhaar(aadhaarInput.replace(/\s/g, "")),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        setServerOtp(data.otp);
        setStep("otp_sent");} else {
        setError(data.error || "Aadhaar not found in registry");
        setStep("idle");
      }
    } catch (err) {
      setError("Could not reach UIDAI service");
      setStep("idle");
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setError(null);
    try {
      const response = await fetch("http://localhost:4000/api/uidai/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaarHash: await hashAadhaar(aadhaarInput.replace(/\s/g, "")),
          otp,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOtpVerified(true);
      } else {
        setError("Invalid OTP. Check the green box above for the correct OTP.");
      }
    } catch (err) {
      setError("OTP verification failed");
    }
  };

  // Step 3: Generate ZK proof + full KYC
  const handleVerify = async () => {
    if (!dob || !otpVerified) return;
    setError(null);
    try {
      setStep("proving");
      const date = new Date(dob);
      const proofResult = await generateAgeProof(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );

      setStep("verifying");
      const aadhaarHash = await hashAadhaar(aadhaarInput.replace(/\s/g, ""));
      const response = await fetch("http://localhost:4000/api/verify/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: proofResult.proof,
          publicSignals: proofResult.publicSignals,
          aadhaarHash,
        }),
      });
      const data = await response.json();
      setResult({ ...data, timeTaken: proofResult.timeTaken });
      setStep("done");
    } catch (err) {
      setError(err.message);
      setStep("otp_sent");
    }
  };

  const hashAadhaar = async (aadhaar) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(aadhaar);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const reset = () => {
    setStep("idle"); setResult(null); setAadhaarInput("");
    setDob(""); setOtp(""); setOtpSent(false);
    setOtpVerified(false); setError(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>AADHAAR KYC — ZERO KNOWLEDGE</div>
          <h1 style={styles.title}>Identity Verification</h1>
          <p style={styles.subtitle}>
            Verify Aadhaar and age — no PII leaves your device
          </p>
        </div>

        {/* Test numbers hint */}
        <div style={styles.testBox}>
          <p style={styles.testTitle}>Demo — use these test Aadhaar numbers:</p>
          {TEST_AADHAAR_NUMBERS.map((n) => (
            <button
              key={n}
              onClick={() => { setAadhaarInput(n); setError(null); }}
              style={styles.testChip}
            >
              {n}
            </button>
          ))}
          <p style={{fontSize:"12px", color:"#92400e", marginTop:"8px", marginBottom:0}}>
            After clicking a number, request OTP — the OTP will appear on screen automatically.
        </p>
          
        </div>

        {/* Privacy guarantees */}
        <div style={styles.guaranteeBox}>
          <GuaranteeItem icon="🔐" text="Aadhaar number hashed in browser" />
          <GuaranteeItem icon="🧮" text="Age proved via Groth16 ZK proof" />
          <GuaranteeItem icon="✅" text="Verhoeff checksum validated" />
          <GuaranteeItem icon="🚫" text="Raw Aadhaar never transmitted" />
        </div>

        {/* Aadhaar input */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Aadhaar Number</label>
          <input
            type="text"
            value={aadhaarInput}
            onChange={(e) => {
              setAadhaarInput(formatAadhaar(e.target.value));
              setOtpSent(false); setOtpVerified(false); setError(null);
            }}
            placeholder="XXXX XXXX XXXX"
            style={{
              ...styles.input,
              borderColor: aadhaarInput
                ? isAadhaarValid ? "#22c55e" : "#ef4444"
                : "#d1d5db",
            }}
            disabled={step === "proving" || step === "verifying" || step === "done"}
          />
          {aadhaarInput && (
            <p style={{ fontSize: "12px", margin: "4px 0 0", color: isAadhaarValid ? "#15803d" : "#dc2626" }}>
              {isAadhaarValid ? "✓ Valid Aadhaar (Verhoeff checksum passed)" : `✗ ${aadhaarValidation.error}`}
            </p>
          )}
        </div>

        {/* OTP section */}
        {isAadhaarValid && !otpVerified && (
          <div style={styles.otpSection}>
            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={step === "sending_otp"}
                style={styles.otpButton}
              >
                {step === "sending_otp" ? "⏳ Sending OTP..." : "📱 Send OTP to registered mobile"}
              </button>
            ) : (
              <div>
                <div style={styles.otpSentNote}>
                  ✅ OTP sent to mobile linked with your Aadhaar
                </div>
                {serverOtp && (
                  <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", padding: "12px", marginBottom: "12px", textAlign: "center" }}>
                    <p style={{ fontSize: "11px", color: "#15803d", margin: "0 0 4px", fontWeight: "600" }}>DEMO MODE — Your OTP is:</p>
                    <p style={{ fontSize: "32px", fontWeight: "700", color: "#15803d", fontFamily: "monospace", margin: 0, letterSpacing: "10px" }}>{serverOtp}</p>
                  </div>
                )}
                <label style={styles.label}>Enter OTP</label>
                <div style={styles.otpRow}>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    style={{ ...styles.input, fontFamily: "monospace", letterSpacing: "4px" }}
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6}
                    style={{
                      ...styles.verifyOtpBtn,
                      opacity: otp.length !== 6 ? 0.5 : 1,
                    }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OTP verified — show DOB input */}
        {otpVerified && step !== "done" && (
          <div style={styles.otpVerifiedBox}>
            <p style={styles.otpVerifiedText}>
              ✅ Aadhaar OTP verified — identity confirmed
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={styles.input}
                max={new Date().toISOString().split("T")[0]}
                disabled={step === "proving" || step === "verifying"}
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={!dob || step === "proving" || step === "verifying"}
              style={{
                ...styles.button,
                opacity: !dob || loading ? 0.5 : 1,
                cursor: !dob || loading ? "not-allowed" : "pointer",
              }}
            >
              {step === "proving"
                ? "⏳ Generating ZK Proof in browser..."
                : step === "verifying"
                ? "🔄 Verifying on server..."
                : "Generate Proof & Complete KYC →"}
            </button>
          </div>
        )}

        {/* Progress */}
        {(step === "proving" || step === "verifying" || step === "done") && (
          <div style={styles.progressBox}>
            <ProgressStep label="Aadhaar OTP verified" done={true} active={false} />
            <ProgressStep label="Generating ZK proof in browser" done={step === "verifying" || step === "done"} active={step === "proving"} />
            <ProgressStep label="Verifying proof on server" done={step === "done"} active={step === "verifying"} />
            <ProgressStep label="KYC complete" done={step === "done"} active={false} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}

        {/* Result */}
        {step === "done" && result && (
          <div style={{
            ...styles.resultBox,
            borderColor: result.verified ? "#22c55e" : "#ef4444",
            background: result.verified ? "#f0fdf4" : "#fef2f2",
          }}>
            <p style={styles.resultTitle}>
              {result.verified ? "✅ KYC Verified Successfully" : "❌ KYC Failed"}
            </p>
            <ResultRow label="Age 18+" value={result.ageVerified ? "Proved ✓" : "Failed ✗"} />
            <ResultRow label="Aadhaar validity" value={result.aadhaarVerified ? "Verified ✓" : "Failed ✗"} />
            <ResultRow label="Verhoeff checksum" value="Passed ✓" />
            <ResultRow label="OTP authentication" value="Passed ✓" />
            <ResultRow label="PII transmitted" value="None ✓" />
            <ResultRow label="Proof time" value={`${result.timeTaken}s`} />
            <ResultRow label="Server latency" value={`${result.latencyMs}ms`} />
            <ResultRow label="Method" value="Groth16 ZKP" />
          </div>
        )}

        {step === "done" && (
          <button onClick={reset} style={styles.resetButton}>
            Start New Verification
          </button>
        )}
      </div>
    </div>
  );
}

function GuaranteeItem({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: "#6d28d9" }}>{text}</span>
    </div>
  );
}

function ProgressStep({ label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
        background: done ? "#22c55e" : active ? "#6d28d9" : "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "10px", color: "#fff", fontWeight: "700",
      }}>
        {done ? "✓" : active ? "…" : "○"}
      </div>
      <span style={{
        fontSize: "13px",
        color: done ? "#15803d" : active ? "#6d28d9" : "#94a3b8",
        fontWeight: active || done ? "600" : "400",
      }}>
        {label}
      </span>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: "600", color: "#15803d" }}>{value}</span>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "20px" },
  card: { background: "#ffffff", borderRadius: "16px", padding: "40px", maxWidth: "520px", width: "100%", boxShadow: "0 4px 24px rgb(248, 248, 248)", border: "1px solid #e2e8f0" },
  header: { marginBottom: "20px" },
  badge: { display: "inline-block", background: "#ede9fe", color: "#6d28d9", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", padding: "4px 10px", borderRadius: "6px", marginBottom: "12px" },
  title: { fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  testBox: { background: "#fefce8", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px", marginBottom: "16px" },
  testTitle: { fontSize: "12px", fontWeight: "600", color: "#92400e", margin: "0 0 8px" },
  testChip: { display: "inline-block", margin: "3px", padding: "4px 10px", background: "#fff", border: "1px solid #fcd34d", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace", cursor: "pointer", color: "#78350f" },
  testNote: { fontSize: "12px", color: "#92400e", margin: "8px 0 0" },
  guaranteeBox: { display: "flex", flexDirection: "column", gap: "6px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "12px", marginBottom: "20px" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px", color: "#111827", background: "#ffffff", boxSizing: "border-box", fontFamily: "monospace" },
  otpSection: { marginBottom: "16px" },
  otpButton: { width: "100%", padding: "11px", background: "#0369a1", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "8px" },
  otpSentNote: { fontSize: "12px", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px" },
  otpRow: { display: "flex", gap: "8px" },
  verifyOtpBtn: { padding: "10px 16px", background: "#6d28d9", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  otpVerifiedBox: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "16px" },
  otpVerifiedText: { fontSize: "13px", color: "#15803d", fontWeight: "600", margin: "0 0 14px" },
  button: { width: "100%", padding: "13px", background: "#6d28d9", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  progressBox: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px", marginBottom: "16px" },
  errorText: { color: "#dc2626", fontSize: "13px", margin: 0 },
  resultBox: { border: "2px solid", borderRadius: "10px", padding: "16px", marginBottom: "16px" },
  resultTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 12px" },
  resetButton: { width: "100%", padding: "12px", background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
};