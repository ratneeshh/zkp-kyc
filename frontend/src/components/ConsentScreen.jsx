export default function ConsentScreen({ onAccept }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>DPDP ACT 2023 COMPLIANT</div>
          <h1 style={styles.title}>Privacy Notice & Consent</h1>
          <p style={styles.subtitle}>
            Please read carefully before proceeding with KYC verification
          </p>
        </div>

        {/* What we collect */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>What we verify</h3>
          <div style={styles.itemList}>
            <ConsentItem
              icon="🎂"
              title="Age (18+)"
              desc="We verify you are above 18. Your exact date of birth is never transmitted."
            />
            <ConsentItem
              icon="🪪"
              title="Aadhaar Validity"
              desc="We verify your Aadhaar is valid. Your Aadhaar number is never sent to our servers."
            />
          </div>
        </div>

        {/* How ZKP works */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>How your privacy is protected</h3>
          <div style={styles.zkpBox}>
            <div style={styles.zkpStep}>
              <span style={styles.zkpNum}>1</span>
              <span style={styles.zkpText}>
                Your data is processed <strong>only in your browser</strong>
              </span>
            </div>
            <div style={styles.zkpStep}>
              <span style={styles.zkpNum}>2</span>
              <span style={styles.zkpText}>
                A cryptographic proof is generated — <strong>not your data</strong>
              </span>
            </div>
            <div style={styles.zkpStep}>
              <span style={styles.zkpNum}>3</span>
              <span style={styles.zkpText}>
                Only the proof is sent to our server — <strong>zero PII transmitted</strong>
              </span>
            </div>
            <div style={styles.zkpStep}>
              <span style={styles.zkpNum}>4</span>
              <span style={styles.zkpText}>
                Server verifies the proof — <strong>result: pass or fail only</strong>
              </span>
            </div>
          </div>
        </div>

        {/* DPDP rights */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Your rights under DPDP Act 2023</h3>
          <div style={styles.rightsGrid}>
            {[
              { icon: "✋", right: "Right to withdraw consent anytime" },
              { icon: "🗑️", right: "Right to erasure of your data" },
              { icon: "🎯", right: "Purpose limitation — used only for KYC" },
              { icon: "🔍", right: "Right to access what we store" },
            ].map((r) => (
              <div key={r.right} style={styles.rightItem}>
                <span style={styles.rightIcon}>{r.icon}</span>
                <span style={styles.rightText}>{r.right}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What we store */}
        <div style={styles.storeBox}>
          <p style={styles.storeTitle}>📦 What gets stored on our server</p>
          <div style={styles.storeRow}>
            <span style={styles.storeLabel}>Your name</span>
            <span style={styles.storeNo}>Never stored</span>
          </div>
          <div style={styles.storeRow}>
            <span style={styles.storeLabel}>Your DOB</span>
            <span style={styles.storeNo}>Never stored</span>
          </div>
          <div style={styles.storeRow}>
            <span style={styles.storeLabel}>Your Aadhaar number</span>
            <span style={styles.storeNo}>Never stored</span>
          </div>
          <div style={styles.storeRow}>
            <span style={styles.storeLabel}>Verification result</span>
            <span style={styles.storeYes}>Pass / Fail only</span>
          </div>
          <div style={styles.storeRow}>
            <span style={styles.storeLabel}>Timestamp</span>
            <span style={styles.storeYes}>Stored for audit</span>
          </div>
        </div>

        {/* Accept button */}
        <button onClick={onAccept} style={styles.acceptButton}>
          I Understand & Give Consent →
        </button>
        <p style={styles.footer}>
          By continuing you agree to privacy-preserving verification powered by
          Zero-Knowledge Proofs
        </p>
      </div>
    </div>
  );
}

function ConsentItem({ icon, title, desc }) {
  return (
    <div style={styles.consentItem}>
      <span style={styles.consentIcon}>{icon}</span>
      <div>
        <p style={styles.consentTitle}>{title}</p>
        <p style={styles.consentDesc}>{desc}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, sans-serif",
    padding: "20px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "580px",
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  header: { marginBottom: "28px" },
  badge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "1px",
    padding: "4px 10px",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  title: { fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  section: { marginBottom: "24px" },
  sectionTitle: { fontSize: "14px", fontWeight: "700", color: "#374151", marginBottom: "12px" },
  itemList: { display: "flex", flexDirection: "column", gap: "10px" },
  consentItem: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  consentIcon: { fontSize: "22px", flexShrink: 0 },
  consentTitle: { fontSize: "13px", fontWeight: "600", color: "#111827", margin: "0 0 4px" },
  consentDesc: { fontSize: "12px", color: "#64748b", margin: 0 },
  zkpBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  zkpStep: { display: "flex", alignItems: "center", gap: "12px" },
  zkpNum: {
    width: "24px", height: "24px", borderRadius: "50%",
    background: "#3b82f6", color: "#fff",
    fontSize: "12px", fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  zkpText: { fontSize: "13px", color: "#1e40af" },
  rightsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  rightItem: {
    display: "flex", alignItems: "flex-start", gap: "8px",
    padding: "10px", background: "#fafafa",
    border: "1px solid #e2e8f0", borderRadius: "8px",
  },
  rightIcon: { fontSize: "16px", flexShrink: 0 },
  rightText: { fontSize: "12px", color: "#374151" },
  storeBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "24px",
  },
  storeTitle: { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 12px" },
  storeRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", borderBottom: "1px solid #f1f5f9",
  },
  storeLabel: { fontSize: "13px", color: "#64748b" },
  storeNo: { fontSize: "12px", fontWeight: "600", color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: "4px" },
  storeYes: { fontSize: "12px", fontWeight: "600", color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: "4px" },
  acceptButton: {
    width: "100%", padding: "14px",
    background: "#16a34a", color: "#fff",
    border: "none", borderRadius: "10px",
    fontSize: "15px", fontWeight: "600",
    cursor: "pointer", marginBottom: "12px",
  },
  footer: { fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: 0 },
};