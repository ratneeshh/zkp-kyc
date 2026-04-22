const express = require("express");
const cors = require("cors");
const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const VERIFICATION_KEY_PATH = path.join(
  __dirname,
  "../circuits/verification_key.json"
);

let verificationKey = null;

const loadVerificationKey = () => {
  try {
    const raw = fs.readFileSync(VERIFICATION_KEY_PATH, "utf8");
    verificationKey = JSON.parse(raw);
    console.log("✅ Verification key loaded");
  } catch (err) {
    console.error("❌ Failed to load verification key:", err.message);
    process.exit(1);
  }
};

const { registerBankAdapter } = require("./adapters/bankAdapter");

// --------------------------------------------------
// Mock UIDAI Registry
// These are SHA-256 hashes of valid test Aadhaar numbers
// Real numbers: 234567890126 / 456789012348 / 678901234560
// We store ONLY hashes — never real Aadhaar numbers
// --------------------------------------------------
const sha256 = (str) =>
  crypto.createHash("sha256").update(str).digest("hex");

const AADHAAR_REGISTRY = {
  // 2200 0000 0004 — DOB: 1995-06-15 (adult, age 30) ✅
  "ceb6ab48c529819f5629115fbaa540ed3a2df25bf3594131f271dc4a728c79ca": { dob: "1995-06-15" },
  // 2200 0000 1102 — DOB: 2010-03-20 (minor, age 15) ❌
  "dddb4a4a3b0be2bdc23a68d766f0e1cac88e4b68858a7b98dee4e5d72cf7c606": { dob: "2010-03-20" },
  // 2200 0000 1490 — DOB: 1998-11-08 (adult, age 26) ✅
  "ae2c84963cfebb479e37601403dc2063a5a23871c2909b2a035bdbb26965c775": { dob: "1998-11-08" },
};
const VALID_AADHAAR_HASHES = new Set(Object.keys(AADHAAR_REGISTRY));


// OTP store — maps aadhaarHash -> { otp, expiresAt }
const otpStore = new Map();

// Audit log — zero PII
const auditLog = [];
const logAudit = (type, result, latencyMs) => {
  auditLog.push({
    type,
    result,
    latencyMs,
    timestamp: new Date().toISOString(),
    piiStored: false,
  });
};

// --------------------------------------------------
// Health check
// --------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "ZKP-KYC Verifier + Mock UIDAI",
    piiStored: false,
    totalVerifications: auditLog.length,
  });
});

// --------------------------------------------------
// Mock UIDAI — Send OTP
// --------------------------------------------------
app.post("/api/uidai/send-otp", (req, res) => {
  const { aadhaarHash } = req.body;

  if (!aadhaarHash) {
    return res.status(400).json({ success: false, error: "Missing aadhaarHash" });
  }

  console.log("📨 OTP request for hash:", aadhaarHash.slice(0, 8) + "...");

  // Check if Aadhaar hash exists in our registry
  if (!VALID_AADHAAR_HASHES.has(aadhaarHash)) {
    console.log("❌ Aadhaar hash not found in registry");
    return res.status(404).json({
      success: false,
      error: "Aadhaar not found in UIDAI registry. Use one of the test numbers.",
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(aadhaarHash, { otp, expiresAt });

  console.log(`✅ OTP generated for valid Aadhaar (demo: ${otp})`);

  // In real system OTP goes to phone — in demo we return it
  return res.json({
    success: true,
    message: "OTP sent to registered mobile number",
    otp, // Only for demo — remove in production
    expiresInSeconds: 300,
  });
});

// --------------------------------------------------
// Mock UIDAI — Verify OTP
// --------------------------------------------------
app.post("/api/uidai/verify-otp", (req, res) => {
  const { aadhaarHash, otp } = req.body;

  if (!aadhaarHash || !otp) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  const record = otpStore.get(aadhaarHash);

  if (!record) {
    return res.status(400).json({ success: false, error: "No OTP found. Request a new one." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(aadhaarHash);
    return res.status(400).json({ success: false, error: "OTP expired. Request a new one." });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, error: "Invalid OTP" });
  }

  // OTP verified — clear it so it can't be reused
  otpStore.delete(aadhaarHash);
  console.log("✅ OTP verified successfully");

  const registryEntry = AADHAAR_REGISTRY[aadhaarHash];
  return res.json({ success: true, message: "OTP verified", dob: registryEntry?.dob });
});

// --------------------------------------------------
// Age verification endpoint
// --------------------------------------------------
app.post("/api/verify/age", async (req, res) => {
  const startTime = Date.now();
  try {
    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({ verified: false, error: "Missing proof or publicSignals" });
    }

    console.log("📨 Age verification received");

    const isValid = await snarkjs.groth16.verify(
      verificationKey,
      publicSignals,
      proof
    );

    // publicSignals[0] is isOldEnough — must be "1" to pass
    const isOldEnough = publicSignals[0] === "1";
    const verified = isValid && isOldEnough;

    const latencyMs = Date.now() - startTime;
    logAudit("age_verification", verified, latencyMs);

    return res.json({
      verified: verified,
      latencyMs,
      piiReceived: false,
      message: isValid ? "User is 18 or older" : "Proof invalid",
    });
  } catch (err) {
    return res.status(500).json({ verified: false, error: err.message });
  }
});

// --------------------------------------------------
// Full KYC endpoint
// --------------------------------------------------
app.post("/api/verify/kyc", async (req, res) => {
  const startTime = Date.now();
  try {
    const { proof, publicSignals, aadhaarHash } = req.body;

    if (!proof || !publicSignals || !aadhaarHash) {
      return res.status(400).json({ verified: false, error: "Missing required fields" });
    }

    console.log("📨 Full KYC request received");
    console.log("🔒 Aadhaar hash:", aadhaarHash.slice(0, 8) + "...");

    // Verify ZK age proof
    const proofValid = await snarkjs.groth16.verify(
      verificationKey,
      publicSignals,
      proof
    );

    // publicSignals[0] is isOldEnough — must be "1" to pass
    const ageValid = proofValid && publicSignals[0] === "1";

    // Check Aadhaar hash is in our registry
    const aadhaarValid = VALID_AADHAAR_HASHES.has(aadhaarHash);

    const verified = ageValid && aadhaarValid;
    const latencyMs = Date.now() - startTime;

    logAudit("kyc_verification", verified, latencyMs);

    console.log(`✅ KYC: ${verified} | Age: ${ageValid} | Aadhaar: ${aadhaarValid} | ${latencyMs}ms`);

    return res.json({
      verified,
      ageVerified: ageValid,
      aadhaarVerified: aadhaarValid,
      latencyMs,
      piiReceived: false,
      piiStored: false,
      message: verified ? "KYC passed" : "KYC failed",
    });
  } catch (err) {
    return res.status(500).json({ verified: false, error: err.message });
  }
});

// --------------------------------------------------
// Audit log endpoint
// --------------------------------------------------
app.get("/api/audit", (req, res) => {
  res.json({
    totalVerifications: auditLog.length,
    log: auditLog,
    piiInLog: false,
    compliance: "DPDP Act 2023",
  });
});

const PORT = 4000;
loadVerificationKey();
registerBankAdapter(app, snarkjs, verificationKey);
// Load student verification key
let studentVerificationKey = null;
try {
  const raw = fs.readFileSync(path.join(__dirname, "../circuits/student_verification_key.json"), "utf8");
  studentVerificationKey = JSON.parse(raw);
  console.log("✅ Student verification key loaded");
} catch (err) {
  console.error("⚠️  Student verification key not found:", err.message);
}

// Student ID verification endpoint
app.post("/api/verify/student", async (req, res) => {
  const startTime = Date.now();
  try {
    const { proof, publicSignals, institutionName } = req.body;
    if (!proof || !publicSignals) return res.status(400).json({ error: "Missing proof" });

    if (!studentVerificationKey) return res.status(500).json({ error: "Student verification key not loaded" });

    const proofValid = await snarkjs.groth16.verify(studentVerificationKey, publicSignals, proof);

    // publicSignals: [isAdult, isEnrolled, isTierValid, isValidStudent, currentYear, currentMonth, currentDay, minTier]
    const isAdult      = publicSignals[0] === "1";
    const isEnrolled   = publicSignals[1] === "1";
    const isTierValid  = publicSignals[2] === "1";
    const isValidStudent = publicSignals[3] === "1";
    const verified = proofValid && isValidStudent;

    const latencyMs = Date.now() - startTime;
    console.log(`🎓 Student verify: adult=${isAdult} enrolled=${isEnrolled} tier=${isTierValid} → ${verified} (${latencyMs}ms)`);
    logAudit("student_verification", verified, latencyMs);

    return res.json({
      verified,
      isAdult,
      isEnrolled,
      isTierValid,
      isValidStudent,
      latencyMs,
      piiTransmitted: "None",
      method: "Groth16 ZKP",
    });
  } catch (err) {
    console.error("Student verify error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 ZKP-KYC Verifier running on http://localhost:${PORT}`);
  console.log(`🔒 PII stored: NONE`);
  console.log(`🇮🇳 Mock UIDAI registry: 3 test Aadhaar numbers loaded`);
  console.log(`📋 Audit log: http://localhost:${PORT}/api/audit`);
  console.log(`\n✅ Valid test Aadhaar numbers:`);
  console.log(`   2200 0000 0004`);
  console.log(`   2200 0000 1102`);
  console.log(`   2200 0000 1490`);
  console.log(`🏦 Bank adapter: http://localhost:${PORT}/api/bank/onboard`);
  console.log(`📊 Benchmark: http://localhost:${PORT}/api/bank/benchmark`);
});