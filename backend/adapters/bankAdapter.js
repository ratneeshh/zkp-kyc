// Mock Bank/NBFC Onboarding Adapter
// Sits between ZKP verifier and bank's core system
// Bank never sees PII — only receives PASS/FAIL + session token

const crypto = require("crypto");

// Mock bank customer database — stores only verification tokens, zero PII
const verifiedCustomers = new Map();

// Mock traditional e-KYC simulation (for benchmarking comparison)
const simulateTraditionalKYC = async () => {
  // Simulate UIDAI API round trip latency (real world: 2000-5000ms)
  const latency = 2000 + Math.floor(Math.random() * 3000);
  await new Promise((r) => setTimeout(r, latency));
  return {
    method: "traditional_ekyc",
    latencyMs: latency,
    piiTransmitted: [
      "full_name",
      "date_of_birth",
      "aadhaar_number",
      "address",
      "photo",
      "mobile_number",
    ],
    piiStored: true,
    dataBreachRisk: "HIGH",
  };
};

const registerBankAdapter = (app, snarkjs, verificationKey) => {
  // --------------------------------------------------
  // Bank onboarding endpoint — ZKP based
  // --------------------------------------------------
  app.post("/api/bank/onboard", async (req, res) => {
    const startTime = Date.now();
    try {
      const { proof, publicSignals, aadhaarHash, accountType } = req.body;

      if (!proof || !publicSignals || !aadhaarHash) {
        return res.status(400).json({ success: false, error: "Missing fields" });
      }

      console.log("🏦 Bank onboarding request received");
      console.log("💳 Account type:", accountType || "savings");
      console.log("🔒 PII received: NONE");

      // Verify ZK proof
      const proofValid = await snarkjs.groth16.verify(
        verificationKey,
        publicSignals,
        proof
      );

      const isOldEnough = publicSignals[0] === "1";
      const ageVerified = proofValid && isOldEnough;
      const aadhaarVerified =
        typeof aadhaarHash === "string" && aadhaarHash.length === 64;

      if (!ageVerified || !aadhaarVerified) {
        return res.json({
          success: false,
          reason: !ageVerified ? "Age verification failed" : "Aadhaar invalid",
          piiReceived: false,
        });
      }

      // Generate session token — this is what bank stores, not PII
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const customerId = "CUST" + Date.now();

      verifiedCustomers.set(sessionToken, {
        customerId,
        aadhaarHash, // only the hash
        verifiedAt: new Date().toISOString(),
        accountType: accountType || "savings",
        kycMethod: "ZKP_GROTH16",
        piiStored: false,
      });

      const latencyMs = Date.now() - startTime;

      console.log(`✅ Bank onboarding complete: ${customerId} (${latencyMs}ms)`);
      console.log(`🔑 Session token issued — zero PII stored`);

      return res.json({
        success: true,
        customerId,
        sessionToken,
        accountType: accountType || "savings",
        kycMethod: "ZKP_GROTH16",
        latencyMs,
        piiStored: false,
        message: "Account opened successfully via ZKP-KYC",
      });
    } catch (err) {
      console.error("❌ Bank onboard error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------
  // Benchmark endpoint — compares ZKP vs traditional
  // --------------------------------------------------
  app.post("/api/bank/benchmark", async (req, res) => {
    const { proof, publicSignals, aadhaarHash } = req.body;

    console.log("📊 Running benchmark: ZKP vs Traditional e-KYC");

    // Run ZKP verification
    const zkpStart = Date.now();
    const proofValid = await snarkjs.groth16.verify(
      verificationKey,
      publicSignals,
      proof
    );
    const isOldEnough = publicSignals[0] === "1";
    const zkpLatency = Date.now() - zkpStart;

    // Simulate traditional e-KYC
    const traditional = await simulateTraditionalKYC();

    return res.json({
      zkp: {
        method: "Groth16 ZKP",
        latencyMs: zkpLatency,
        verified: proofValid && isOldEnough,
        piiTransmitted: [],
        piiStored: false,
        dataBreachRisk: "NONE",
        complianceScore: 100,
      },
      traditional: {
        method: "Traditional e-KYC",
        latencyMs: traditional.latencyMs,
        verified: true,
        piiTransmitted: traditional.piiTransmitted,
        piiStored: true,
        dataBreachRisk: "HIGH",
        complianceScore: 45,
      },
      improvement: {
        latencyReduction: `${Math.round((1 - zkpLatency / traditional.latencyMs) * 100)}%`,
        piiReduction: "100%",
        breachRiskReduction: "100%",
      },
    });
  });

  // --------------------------------------------------
  // Get verified customers (audit — no PII)
  // --------------------------------------------------
  app.get("/api/bank/customers", (req, res) => {
    const customers = Array.from(verifiedCustomers.values()).map((c) => ({
      customerId: c.customerId,
      verifiedAt: c.verifiedAt,
      accountType: c.accountType,
      kycMethod: c.kycMethod,
      piiStored: false,
    }));

    return res.json({
      total: customers.length,
      customers,
      piiInResponse: false,
    });
  });
};

module.exports = { registerBankAdapter };