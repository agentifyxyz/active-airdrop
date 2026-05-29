"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther } from "viem";
import { base } from "viem/chains";

const VEST_END = new Date("2026-12-19T00:00:00Z");
const ALCHEMY_RPC = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`;
const VESTING_VAULT = process.env.NEXT_PUBLIC_VESTING_VAULT as `0x${string}`;

const VAULT_ABI = [
  { name: "vestedBalance", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "released", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "release", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "VEST_END", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] }
] as const;

export default function Vesting() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [vestedAmount, setVestedAmount] = useState("0");
  const [released, setReleased] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const signerWallet = wallets.find(w => w.walletClientType !== "privy") || wallets[0];

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = VEST_END.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Unlocked!"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (signerWallet) fetchVesting(signerWallet.address);
  }, [signerWallet]);

  async function fetchVesting(address: string) {
    try {
      const publicClient = createPublicClient({ chain: base, transport: http(ALCHEMY_RPC) });
      const [vested, rel] = await Promise.all([
        publicClient.readContract({ address: VESTING_VAULT, abi: VAULT_ABI, functionName: "vestedBalance", args: [address as `0x${string}`] }),
        publicClient.readContract({ address: VESTING_VAULT, abi: VAULT_ABI, functionName: "released", args: [address as `0x${string}`] })
      ]);
      setVestedAmount(formatEther(vested as bigint));
      setReleased(released as boolean);
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  async function handleRelease() {
    if (!signerWallet) return;
    setLoading(true);
    try {
      await signerWallet.switchChain(8453);
      const provider = await signerWallet.getEthereumProvider();
      const walletClient = createWalletClient({ account: signerWallet.address as `0x${string}`, chain: base, transport: custom(provider) });
      const hash = await walletClient.writeContract({ address: VESTING_VAULT, abi: VAULT_ABI, functionName: "release" });
      setStatus("TX: " + hash);
      const publicClient = createPublicClient({ chain: base, transport: http(ALCHEMY_RPC) });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("✅ Released!");
      setReleased(true);
    } catch (e: any) {
      setStatus("❌ " + e.message);
    }
    setLoading(false);
  }

  const unlocked = Date.now() >= VEST_END.getTime();

  return (
    <main style={{minHeight: "100vh", backgroundColor: "#ffffff"}}>
      <header style={{borderBottom: "1px solid #dbeafe", padding: "16px 24px"}}>
        <span style={{fontWeight: "bold", color: "#1e3a8a", fontSize: "18px"}}>🔒 Vesting</span>
      </header>
      <div style={{maxWidth: "480px", margin: "0 auto", padding: "32px 24px"}}>
        <div style={{backgroundColor: "#1D6FEB", borderRadius: "16px", padding: "24px", textAlign: "center", marginBottom: "24px", boxShadow: "0 10px 25px rgba(29,111,235,0.25)"}}>
          <p style={{color: "#bfdbfe", fontSize: "13px", marginBottom: "4px"}}>Unlocks in</p>
          <p style={{color: "white", fontWeight: "bold", fontSize: "24px"}}>{timeLeft}</p>
          <p style={{color: "#bfdbfe", fontSize: "12px", marginTop: "8px"}}>December 19, 2026</p>
        </div>

        {!authenticated ? (
          <div style={{textAlign: "center", padding: "40px 0"}}>
            <p style={{color: "#93c5fd", marginBottom: "16px"}}>Connect to see your vested tokens</p>
            <button onClick={login} style={{backgroundColor: "#1D6FEB", color: "white", padding: "14px 32px", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer"}}>Connect</button>
          </div>
        ) : (
          <div style={{backgroundColor: "white", border: "2px solid #dbeafe", borderRadius: "16px", padding: "24px"}}>
            <div style={{backgroundColor: "#eff6ff", borderRadius: "12px", padding: "20px", marginBottom: "20px", textAlign: "center"}}>
              <p style={{color: "#60a5fa", fontSize: "14px", marginBottom: "8px"}}>Your vested balance</p>
              <p style={{color: "#1e3a8a", fontWeight: "bold", fontSize: "32px"}}>{parseFloat(vestedAmount).toLocaleString()}</p>
              <p style={{color: "#93c5fd", fontSize: "14px"}}>ACTIVE</p>
            </div>

            {released ? (
              <div style={{backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px", textAlign: "center"}}>
                <p style={{color: "#15803d", fontWeight: "600"}}>✅ Already released!</p>
              </div>
            ) : !unlocked ? (
              <div style={{backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "14px", textAlign: "center"}}>
                <p style={{color: "#c2410c", fontSize: "14px"}}>Tokens are locked until Dec 19, 2026</p>
              </div>
            ) : (
              <button onClick={handleRelease} disabled={loading}
                style={{width: "100%", backgroundColor: "#1D6FEB", color: "white", padding: "14px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", border: "none", cursor: "pointer"}}>
                {loading ? "Releasing..." : "Release Tokens"}
              </button>
            )}
            {status && <p style={{color: "#60a5fa", fontSize: "12px", textAlign: "center", marginTop: "10px"}}>{status}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
