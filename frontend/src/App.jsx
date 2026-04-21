import { useState } from "react";
import ConsentScreen from "./components/ConsentScreen";
import AgeVerify from "./pages/AgeVerify";
import AadhaarVerify from "./pages/AadhaarVerify";
import BenchmarkReport from "./pages/BenchmarkReport";
import StudentVerify from "./pages/StudentVerify";

export default function App() {
  const [screen, setScreen] = useState("consent"); // consent | home | age | aadhaar

  if (screen === "consent") {
    return <ConsentScreen onAccept={() => setScreen("home")} />;
  }

  if (screen === "age") {
    return (
      <div>
        <BackButton onClick={() => setScreen("home")} />
        <AgeVerify />
      </div>
    );
  }

  if (screen === "student") {
    return (
      <div>
        <BackButton onClick={() => setScreen("home")} />
        <StudentVerify />
      </div>
    );
  }

  if (screen === "benchmark") {
    return (
      <div>
        <BackButton onClick={() => setScreen("home")} />
        <BenchmarkReport />
      </div>
    );
  }
  
  if (screen === "aadhaar") {
    return (
      <div>
        <BackButton onClick={() => setScreen("home")} />
        <AadhaarVerify />
      </div>
    );
  }

  // Home dashboard
  // Home dashboard
  return (
    <div style={styles.container}>
      {/* Government top bar */}
      <div style={styles.govBar}>
        <span>🇮🇳</span>
        <span>Government of India — Digital Identity Services</span>
        <span style={{ marginLeft: "auto" }}>DPDP Act 2023 Compliant</span>
      </div>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>ZKP-KYC SYSTEM</div>
          <h1 style={styles.title}>Privacy-Preserving KYC Verification</h1>
          <p style={styles.subtitle}>
            Verify your identity using Zero-Knowledge Proofs — your personal data never leaves your device
          </p>
        </div>

        {/* Stats bar */}
        <div style={styles.statsBar}>
          <StatItem label="PII Stored" value="Zero" color="#057a55" />
          <StatItem label="Proof System" value="Groth16" color="#1a56db" />
          <StatItem label="Compliance" value="DPDP 2023" color="#1a56db" />
          <StatItem label="Proof Time" value="< 500ms" color="#057a55" />
        </div>

        {/* Verification options */}
        <div style={styles.optionsGrid}>
          <VerifyCard
            icon="🎂"
            title="Age Verification"
            desc="Prove you are 18+ without revealing your date of birth"
            tag="Basic KYC"
            tagColor="#ebf5ff"
            tagText="#1a56db"
            onClick={() => setScreen("age")}
          />
          <VerifyCard
            icon="🪪"
            title="Aadhaar KYC"
            desc="Verify Aadhaar validity and age — zero PII transmitted"
            tag="Full KYC"
            tagColor="#f3faf7"
            tagText="#057a55"
            onClick={() => setScreen("aadhaar")}
          />
          <VerifyCard
            icon="📊"
            title="Benchmark Report"
            desc="Compare ZKP-KYC vs traditional e-KYC performance"
            tag="Research"
            tagColor="#fdf6b2"
            tagText="#723b13"
            onClick={() => setScreen("benchmark")}
          />
          <VerifyCard
            icon="🎓"
            title="Student ID Verify"
            desc="Prove enrollment & age via college ID card — OCR + ZKP, zero data transmitted"
            tag="Student KYC"
            tagColor="#f3faf7"
            tagText="#057a55"
            onClick={() => setScreen("student")}
          />
        </div>

        {/* How it works */}
        <div style={styles.howBox}>
          <p style={styles.howTitle}>How Zero-Knowledge Proof protects your privacy</p>
          <div style={styles.howSteps}>
            {[
              "Your identity data is processed only inside your browser",
              "A cryptographic proof is generated locally — not your raw data",
              "Only the proof (~200 bytes) is sent to the verification server",
              "Server verifies the proof mathematically — never sees your PII",
            ].map((text, i) => (
              <div key={i} style={styles.howStep}>
                <div style={styles.howNum}>{i + 1}</div>
                <p style={styles.howText}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance footer */}
        <div style={styles.complianceBar}>
          {["DPDP Act 2023", "Groth16 ZKP", "circom 2.2", "snarkjs 0.7", "NIST SP 800-57", "Zero PII"].map((tag) => (
            <span key={tag} style={styles.complianceTag}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed", top: "16px", left: "16px",
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: "6px", padding: "7px 14px",
      fontSize: "13px", fontWeight: "600", color: "#374151",
      cursor: "pointer", zIndex: 100,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      ← Back
    </button>
  );
}

function StatItem({ label, value, color }) {
  return (
    <div style={styles.statItem}>
      <p style={{ ...styles.statValue, color }}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function VerifyCard({ icon, title, desc, tag, tagColor, tagText, onClick }) {
  return (
    <div onClick={onClick} style={styles.verifyCard}>
      <span style={styles.verifyIcon}>{icon}</span>
      <span style={{ ...styles.verifyTag, background: tagColor, color: tagText }}>
        {tag}
      </span>
      <h3 style={styles.verifyTitle}>{title}</h3>
      <p style={styles.verifyDesc}>{desc}</p>
      <span style={styles.verifyArrow}>Start →</span>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
  },
  // Top government header bar
  govBar: {
    background: "#1a56db",
    color: "#fff",
    padding: "8px 32px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "40px",
    maxWidth: "780px",
    width: "100%",
    margin: "32px auto",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
  },
  header: { marginBottom: "32px", borderBottom: "2px solid #1a56db", paddingBottom: "20px" },
  badge: {
    display: "inline-block", background: "#1a56db", color: "#fff",
    fontSize: "11px", fontWeight: "600", letterSpacing: "1px",
    padding: "3px 10px", borderRadius: "4px", marginBottom: "10px",
  },
  title: { fontSize: "26px", fontWeight: "700", color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: "14px", color: "#4b5563", margin: 0 },
  statsBar: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px", marginBottom: "32px",
  },
  statItem: {
    textAlign: "center", padding: "16px",
    background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px",
  },
  statValue: { fontSize: "16px", fontWeight: "700", margin: "0 0 2px" },
  statLabel: { fontSize: "11px", color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" },
  verifyCard: {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: "6px", padding: "20px",
    cursor: "pointer",
    display: "flex", flexDirection: "column", gap: "8px",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  verifyIcon: { fontSize: "24px" },
  verifyTag: {
    display: "inline-block", fontSize: "10px", fontWeight: "600",
    padding: "2px 8px", borderRadius: "3px", width: "fit-content",
    textTransform: "uppercase", letterSpacing: "0.5px",
  },
  verifyTitle: { fontSize: "14px", fontWeight: "700", color: "#111827", margin: 0 },
  verifyDesc: { fontSize: "12px", color: "#6b7280", margin: 0, lineHeight: 1.5 },
  verifyArrow: { fontSize: "13px", color: "#1a56db", fontWeight: "600", marginTop: "4px" },
  howBox: {
    background: "#ebf5ff", border: "1px solid #c3ddfd",
    borderRadius: "6px", padding: "16px", marginBottom: "24px",
  },
  howTitle: { fontSize: "13px", fontWeight: "700", color: "#1e429f", margin: "0 0 12px" },
  howSteps: { display: "flex", flexDirection: "column", gap: "8px" },
  howStep: { display: "flex", alignItems: "center", gap: "12px" },
  howNum: {
    width: "22px", height: "22px", borderRadius: "50%",
    background: "#1a56db", color: "#fff",
    fontSize: "11px", fontWeight: "700", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  howText: { fontSize: "13px", color: "#1e429f", margin: 0 },
  complianceBar: { display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" },
  complianceTag: {
    fontSize: "11px", padding: "3px 10px",
    background: "#f9fafb", color: "#4b5563",
    borderRadius: "4px", border: "1px solid #e5e7eb",
  },
};