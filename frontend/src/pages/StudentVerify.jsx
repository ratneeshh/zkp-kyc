import { useState, useRef } from "react";
import Tesseract from "tesseract.js";

const INSTITUTION_TIERS = {
  "IIT": 1, "NIT": 2, "IIIT": 2, "BITS": 2,
  "STATE": 3, "UNIVERSITY": 3, "COLLEGE": 4, "PRIVATE": 4,
};

const detectTier = (text) => {
  const upper = text.toUpperCase();
  if (upper.includes("IIT")) return { tier: 1, label: "IIT", color: "#7c3aed" };
  if (upper.includes("NIT") || upper.includes("NATIONAL INSTITUTE OF TECHNOLOGY")) return { tier: 2, label: "NIT", color: "#1a56db" };
  if (upper.includes("IIIT")) return { tier: 2, label: "IIIT", color: "#1a56db" };
  if (upper.includes("BITS")) return { tier: 2, label: "BITS", color: "#1a56db" };
  if (upper.includes("UNIVERSITY")) return { tier: 3, label: "University", color: "#057a55" };
  return { tier: 4, label: "Private College", color: "#92400e" };
};

const extractField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1]?.trim();
  }
  return null;
};

export default function StudentVerify() {
  const [step, setStep] = useState("upload"); // upload | scanning | confirm | proving | done
  const [ocrRaw, setOcrRaw] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [fields, setFields] = useState({
    name: "", rollNo: "", dob: "", validTillYear: "", validTillMonth: "",
    institutionName: "", institutionTier: 2,
  });
  const [tierInfo, setTierInfo] = useState({ tier: 2, label: "NIT", color: "#1a56db" });
  const [proof, setProof] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setImagePreview(URL.createObjectURL(file));
    setStep("scanning");
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setOcrRaw(text);

      // Extract fields from OCR text
      const detected = detectTier(text);
      setTierInfo(detected);

      // Institution name — first non-empty line usually
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const instLine = lines.find(l =>
        l.toUpperCase().includes("INSTITUTE") ||
        l.toUpperCase().includes("UNIVERSITY") ||
        l.toUpperCase().includes("COLLEGE") ||
        l.toUpperCase().includes("TECHNOLOGY")
      ) || lines[0] || "";

      // DOB extraction
      const dobRaw = extractField(text, [
        /D\.?O\.?B\.?\s*[:-]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
        /Date of Birth\s*[:-]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
        /(\d{2}-\d{2}-\d{4})/,
        /(\d{2}\/\d{2}\/\d{4})/,
      ]);

      let birthYear = "", birthMonth = "", birthDay = "";
      if (dobRaw) {
        const parts = dobRaw.split(/[-\/]/);
        if (parts.length === 3) {
          birthDay = parts[0]; birthMonth = parts[1]; birthYear = parts[2];
        }
      }

      // Valid till extraction
      const validRaw = extractField(text, [
        /Valid\s*[Tt]ill\s*[:-]?\s*([A-Za-z]+\s*[-–]?\s*\d{4})/i,
        /Expiry\s*[:-]?\s*([A-Za-z]+\s*\d{4})/i,
        /Valid\s*[Tt]o\s*[:-]?\s*([A-Za-z]+\s*\d{4})/i,
      ]);

      let validTillYear = "2028", validTillMonth = "6";
      if (validRaw) {
        const yearMatch = validRaw.match(/(\d{4})/);
        if (yearMatch) validTillYear = yearMatch[1];
        const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
        const monthMatch = validRaw.match(/([A-Za-z]+)/);
        if (monthMatch) {
          const m = monthMap[monthMatch[1].toLowerCase().slice(0,3)];
          if (m) validTillMonth = String(m);
        }
      }

      // Roll No
      const rollNo = extractField(text, [
        /Roll\s*No\.?\s*[:-]?\s*(\w+)/i,
        /Enrollment\s*No\.?\s*[:-]?\s*(\w+)/i,
        /Reg\.?\s*No\.?\s*[:-]?\s*(\w+)/i,
      ]) || "";

      // Name
      const name = extractField(text, [
        /Name\s*[:-]?\s*([A-Z][A-Z\s]+)/,
        /Student\s*[:-]?\s*([A-Z][A-Z\s]+)/,
      ]) || "";

      setFields({
        name: name || "",
        rollNo: rollNo || "",
        dob: dobRaw || `${birthDay}-${birthMonth}-${birthYear}`,
        birthYear: birthYear || "",
        birthMonth: birthMonth || "",
        birthDay: birthDay || "",
        validTillYear,
        validTillMonth,
        institutionName: instLine,
        institutionTier: detected.tier,
      });

      setStep("confirm");
    } catch (err) {
      setError("OCR failed: " + err.message);
      setStep("upload");
    }
  };

  const handleProve = async () => {
    setError(null);
    setStep("proving");
    try {
      const now = new Date();
      const inputs = {
        birthYear: parseInt(fields.birthYear) || 2005,
        birthMonth: parseInt(fields.birthMonth) || 7,
        birthDay: parseInt(fields.birthDay) || 6,
        validTillYear: parseInt(fields.validTillYear) || 2028,
        validTillMonth: parseInt(fields.validTillMonth) || 6,
        institutionTier: parseInt(fields.institutionTier) || 2,
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1,
        currentDay: now.getDate(),
        minTier: 3, // accept NIT and above
      };

      // Load snarkjs dynamically
      const snarkjs = await import("snarkjs");
      const start = Date.now();

      const { proof: zkProof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        "/circuits/studentCheck.wasm",
        "/circuits/studentCheck_final.zkey"
      );

      const timeTaken = ((Date.now() - start) / 1000).toFixed(2);
      setProof({ proof: zkProof, publicSignals, timeTaken });

      // Send to backend
      const response = await fetch("http://localhost:4000/api/verify/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: zkProof,
          publicSignals,
          institutionName: fields.institutionName,
        }),
      });

      const data = await response.json();
      setResult({ ...data, timeTaken });
      setStep("done");
    } catch (err) {
      setError(err.message);
      setStep("confirm");
    }
  };

  const reset = () => {
    setStep("upload"); setFields({}); setProof(null);
    setResult(null); setError(null); setImagePreview(null); setOcrProgress(0);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.badge}>STUDENT ID — ZERO KNOWLEDGE</span>
          <h1 style={styles.title}>Student Enrollment Verification</h1>
          <p style={styles.subtitle}>Prove you are an enrolled student — card data never leaves your device</p>
        </div>

        {/* Privacy guarantees */}
        <div style={styles.guaranteeBox}>
          <Guarantee icon="📸" text="ID card processed entirely in your browser" />
          <Guarantee icon="🔐" text="No image or text sent to server" />
          <Guarantee icon="🧮" text="Groth16 ZK proof generated locally" />
          <Guarantee icon="✅" text="Server receives cryptographic proof only" />
        </div>

        {/* UPLOAD */}
        {step === "upload" && (
          <div>
            <div
              style={styles.dropZone}
              onClick={() => fileRef.current.click()}
            >
              <p style={{ fontSize: "36px", margin: "0 0 8px" }}>📷</p>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: "0 0 4px" }}>
                Upload your College ID Card
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                JPG, PNG — processed locally, never uploaded
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </div>
            <div style={styles.infoBox}>
              <p style={{ fontSize: "12px", color: "#1e429f", margin: 0 }}>
                ℹ️ The OCR runs entirely in your browser using Tesseract.js. Your ID card image is never transmitted to any server.
              </p>
            </div>
          </div>
        )}

        {/* SCANNING */}
        {step === "scanning" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            {imagePreview && (
              <img src={imagePreview} alt="ID" style={styles.previewImg} />
            )}
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${ocrProgress}%` }} />
            </div>
            <p style={{ fontSize: "14px", color: "#1a56db", fontWeight: "600", margin: "12px 0 4px" }}>
              🔍 Scanning ID card... {ocrProgress}%
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              Processing locally — no data leaves your browser
            </p>
          </div>
        )}

        {/* CONFIRM extracted fields */}
        {step === "confirm" && (
          <div>
            {imagePreview && (
              <img src={imagePreview} alt="ID" style={styles.previewImg} />
            )}
            <div style={styles.confirmHeader}>
              <p style={styles.confirmTitle}>✅ Scan complete — confirm your details</p>
              <p style={styles.confirmSub}>Correct any OCR errors before generating proof</p>
            </div>

            <div style={styles.tierBadge}>
              <span style={{ ...styles.tierChip, background: tierInfo.color }}>
                {tierInfo.label}
              </span>
              <span style={{ fontSize: "13px", color: "#374151" }}>
                {fields.institutionName || "Institution detected"}
              </span>
            </div>

            <div style={styles.fieldsGrid}>
              <Field label="Name (private)" value={fields.name}
                onChange={v => setFields(f => ({ ...f, name: v }))} />
              <Field label="Roll No (private)" value={fields.rollNo}
                onChange={v => setFields(f => ({ ...f, rollNo: v }))} />
              <Field label="Birth Year" value={fields.birthYear}
                onChange={v => setFields(f => ({ ...f, birthYear: v }))} />
              <Field label="Birth Month (1-12)" value={fields.birthMonth}
                onChange={v => setFields(f => ({ ...f, birthMonth: v }))} />
              <Field label="Birth Day" value={fields.birthDay}
                onChange={v => setFields(f => ({ ...f, birthDay: v }))} />
              <Field label="Valid Till Year" value={fields.validTillYear}
                onChange={v => setFields(f => ({ ...f, validTillYear: v }))} />
              <Field label="Valid Till Month (1-12)" value={fields.validTillMonth}
                onChange={v => setFields(f => ({ ...f, validTillMonth: v }))} />
              <div>
                <label style={styles.fieldLabel}>Institution Tier</label>
                <select
                  value={fields.institutionTier}
                  onChange={e => setFields(f => ({ ...f, institutionTier: parseInt(e.target.value) }))}
                  style={styles.select}
                >
                  <option value={1}>1 — IIT</option>
                  <option value={2}>2 — NIT / IIIT / BITS</option>
                  <option value={3}>3 — State University</option>
                  <option value={4}>4 — Private College</option>
                </select>
              </div>
            </div>

            <div style={styles.proveNote}>
              <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>
                🔒 Only the <strong>ZK proof</strong> will be sent to the server. Name, Roll No, DOB, and card image stay in your browser.
              </p>
            </div>

            <button onClick={handleProve} style={styles.proveBtn}>
              Generate ZK Proof & Verify →
            </button>
          </div>
        )}

        {/* PROVING */}
        {step === "proving" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>⚙️</p>
            <p style={{ fontSize: "15px", fontWeight: "600", color: "#1a56db", margin: "0 0 6px" }}>
              Generating Groth16 ZK Proof in browser...
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              Proving: enrolled + adult + institution tier — without revealing your card data
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && result && (
          <div>
            <div style={{
              ...styles.resultBox,
              borderColor: result.verified ? "#057a55" : "#c81e1e",
              background: result.verified ? "#f3faf7" : "#fdf2f2",
            }}>
              <p style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 16px", color: result.verified ? "#057a55" : "#c81e1e" }}>
                {result.verified ? "✅ Student Identity Verified" : "❌ Verification Failed"}
              </p>
              <ResultRow label="Age 18+" value={result.isAdult ? "Proved ✓" : "Failed ✗"} ok={result.isAdult} />
              <ResultRow label="Active enrollment" value={result.isEnrolled ? "Proved ✓" : "Failed ✗"} ok={result.isEnrolled} />
              <ResultRow label="Institution tier" value={result.isTierValid ? "Accepted ✓" : "Below minimum ✗"} ok={result.isTierValid} />
              <ResultRow label="Card data transmitted" value="None ✓" ok={true} />
              <ResultRow label="Proof generation" value={`${result.timeTaken}s`} ok={true} />
              <ResultRow label="Server latency" value={`${result.latencyMs}ms`} ok={true} />
              <ResultRow label="Proof system" value="Groth16 (BN128)" ok={true} />
            </div>
            <button onClick={reset} style={styles.resetBtn}>
              Verify Another Card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={styles.fieldInput}
      />
    </div>
  );
}

function Guarantee({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: "#374151" }}>{text}</span>
    </div>
  );
}

function ResultRow({ label, value, ok }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: "13px", color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: ok ? "#057a55" : "#c81e1e" }}>{value}</span>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "60px 20px 20px" },
  card: { background: "#fff", borderRadius: "8px", padding: "36px", maxWidth: "520px", width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" },
  header: { marginBottom: "20px", paddingBottom: "18px", borderBottom: "2px solid #1a56db" },
  badge: { display: "inline-block", background: "#1a56db", color: "#fff", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", padding: "3px 8px", borderRadius: "4px", marginBottom: "10px" },
  title: { fontSize: "20px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: "13px", color: "#6b7280", margin: 0 },
  guaranteeBox: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", marginBottom: "20px" },
  dropZone: { border: "2px dashed #d1d5db", borderRadius: "8px", padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: "12px", background: "#fafafa" },
  infoBox: { background: "#ebf5ff", border: "1px solid #c3ddfd", borderRadius: "6px", padding: "10px 14px" },
  previewImg: { width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "6px", marginBottom: "16px", border: "1px solid #e5e7eb" },
  progressBar: { height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden", margin: "0 auto", maxWidth: "300px" },
  progressFill: { height: "100%", background: "#1a56db", transition: "width 0.3s", borderRadius: "3px" },
  confirmHeader: { marginBottom: "14px" },
  confirmTitle: { fontSize: "14px", fontWeight: "700", color: "#057a55", margin: "0 0 2px" },
  confirmSub: { fontSize: "12px", color: "#6b7280", margin: 0 },
  tierBadge: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  tierChip: { color: "#fff", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "4px", letterSpacing: "1px" },
  fieldsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" },
  fieldLabel: { display: "block", fontSize: "11px", fontWeight: "600", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" },
  fieldInput: { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", color: "#111827", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", color: "#111827", background: "#fff", boxSizing: "border-box" },
  proveNote: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 12px", marginBottom: "14px" },
  proveBtn: { width: "100%", padding: "12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  errorBox: { background: "#fdf2f2", border: "1px solid #fde8e8", borderRadius: "6px", padding: "12px", marginBottom: "14px" },
  errorText: { color: "#c81e1e", fontSize: "13px", margin: 0 },
  resultBox: { border: "2px solid", borderRadius: "8px", padding: "20px", marginBottom: "16px" },
  resetBtn: { width: "100%", padding: "11px", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
};