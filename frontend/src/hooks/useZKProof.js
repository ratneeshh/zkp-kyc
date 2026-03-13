import { useState } from "react";
import * as snarkjs from "snarkjs";

export const useZKProof = () => {
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAgeProof = async (birthYear, birthMonth, birthDay) => {
    setLoading(true);
    setError(null);
    setProof(null);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // These are the PRIVATE inputs — never leave the browser
      const input = {
        birthYear: birthYear,
        birthMonth: birthMonth,
        birthDay: birthDay,
        // These are PUBLIC inputs — sent to verifier
        currentYear: currentYear,
        currentMonth: currentMonth,
        currentDay: currentDay,
      };

      const wasmPath = "/circuits/ageCheck.wasm";
      const zkeyPath = "/circuits/ageCheck_final.zkey";

      const startTime = performance.now();

      const { proof: generatedProof, publicSignals } =
        await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

      setProof({ proof: generatedProof, publicSignals, timeTaken });
      return { proof: generatedProof, publicSignals, timeTaken };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateAgeProof, proof, loading, error };
};