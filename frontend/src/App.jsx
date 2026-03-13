import { useState } from "react";
import ConsentScreen from "./components/ConsentScreen";
import AgeVerify from "./pages/AgeVerify";
import AadhaarVerify from "./pages/AadhaarVerify";

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

  if (screen === "aadhaar") {
    return (
      <div>
        <BackButton onClick={() => setScreen("home")} />
        <AadhaarVerify />
      </div>
    );
  }

  // Home dashboard
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>ZKP-KYC SYSTEM</div>
          <h1 style={styles.title}>Privacy-Preserving KYC</h1>
          <p style={styles.subtitle}>
            Select the verification you want to complete
          </p>
        </div>

        {/* Stats bar */}
        <div style={styles.statsBar}>
          <StatItem label="PII Stored" value="Zero" color="#15803d" />
          <StatItem label="Proof System" value="Groth16" color="#6d28d9" />
          <StatItem label="Compliance" value="DPDP 2023" color="#0369a1" />
          <StatItem label="Proof Time" value="< 1s" color="#b45309" />
        </div>

        {/* Verification options */}
        <div style={styles.optionsGrid}>
          <VerifyCard
            icon="🎂"
            title="Age Verification"
            desc="Prove you are 18+ without revealing your date of birth"
            tag="Basic KYC"
            tagColor="#ede9fe"
            tagText="#6d28d9"
            onClick={() => setScreen("age")}
          />
          <VerifyCard
            icon="🪪"
            title="Aadhaar KYC"
            desc="Verify Aadhaar validity and age together — zero PII transmitted"
            tag="Full KYC"
            tagColor="#dcfce7"
            tagText="#15803d"
            onClick={() => setScreen("aadhaar")}
          />
        </div>

        {/* How it works */}
        <div style={styles.howBox}>
          <p style={styles.howTitle}>How Zero-Knowledge Proof works here</p>
          <div style={styles.howSteps}>
            {[
              { step: "1", text: "You enter your data — stays in your browser" },
              { step: "2", text: "circom circuit generates a Groth16 proof locally" },
              { step: "3", text: "Only the proof (~200 bytes) is sent to server" },
              { step: "4", text: "Server verifies proof — never sees your data" },
            ].map((s) => (
              <div key={s.step} style={styles.howStep}>
                <div style={styles.howNum}>{s.step}</div>
                <p style={styles.howText}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance footer */}
        <div style={styles.complianceBar}>
          {["DPDP Act 2023", "Groth16 ZKP", "circom 2.2", "snarkjs 0.7", "Zero PII"].map((tag) => (
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
      position: "fixed", top: "20px", left: "20px",
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: "8px", padding: "8px 16px",
      fontSize: "13px", fontWeight: "600", color: "#374151",
      cursor: "pointer", zIndex: 100,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
    minHeight: "100vh", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui, sans-serif", padding: "20px",
  },
  card: {
    background: "#ffffff", borderRadius: "16px", padding: "40px",
    maxWidth: "620px", width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0",
  },
  header: { marginBottom: "24px" },
  badge: {
    display: "inline-block", background: "#0f172a", color: "#fff",
    fontSize: "11px", fontWeight: "600", letterSpacing: "1px",
    padding: "4px 10px", borderRadius: "6px", marginBottom: "12px",
  },
  title: { fontSize: "28px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  statsBar: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px", marginBottom: "28px",
    background: "#f8fafc", borderRadius: "10px",
    padding: "16px", border: "1px solid #e2e8f0",
  },
  statItem: { textAlign: "center" },
  statValue: { fontSize: "15px", fontWeight: "700", margin: "0 0 2px" },
  statLabel: { fontSize: "11px", color: "#94a3b8", margin: 0 },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" },
  verifyCard: {
    background: "#fafafa", border: "1px solid #e2e8f0",
    borderRadius: "12px", padding: "20px",
    cursor: "pointer", transition: "all 0.2s",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  verifyIcon: { fontSize: "28px" },
  verifyTag: {
    display: "inline-block", fontSize: "10px", fontWeight: "600",
    padding: "3px 8px", borderRadius: "4px", width: "fit-content",
  },
  verifyTitle: { fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 },
  verifyDesc: { fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.5 },
  verifyArrow: { fontSize: "13px", color: "#6d28d9", fontWeight: "600", marginTop: "4px" },
  howBox: {
    background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: "10px", padding: "16px", marginBottom: "20px",
  },
  howTitle: { fontSize: "13px", fontWeight: "700", color: "#374151", margin: "0 0 12px" },
  howSteps: { display: "flex", flexDirection: "column", gap: "8px" },
  howStep: { display: "flex", alignItems: "center", gap: "12px" },
  howNum: {
    width: "22px", height: "22px", borderRadius: "50%",
    background: "#6d28d9", color: "#fff",
    fontSize: "11px", fontWeight: "700", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  howText: { fontSize: "13px", color: "#475569", margin: 0 },
  complianceBar: { display: "flex", flexWrap: "wrap", gap: "8px" },
  complianceTag: {
    fontSize: "11px", padding: "4px 10px",
    background: "#f1f5f9", color: "#64748b",
    borderRadius: "6px", border: "1px solid #e2e8f0",
  },
};