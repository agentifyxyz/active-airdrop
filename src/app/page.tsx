"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther } from "viem";
import { base } from "viem/chains";
import { getBaseTxCount, signClaim } from "@/lib/alchemy";
import { AIRDROP_CLAIM_ADDRESS, AIRDROP_CLAIM_ABI, ACTIVE_TOKEN_ADDRESS, ACTIVE_TOKEN_ABI } from "@/lib/contracts";

const CLAIM_FEE = parseEther("0.00025");
const CAMPAIGN_END = new Date("2026-06-17T00:00:00Z");

export default function Home() {
  const { login, logout, authenticated, user, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const [manualAddress, setManualAddress] = useState("");
  const [txCount, setTxCount] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [balance, setBalance] = useState("0");

  const isGoogleUser = user?.google && wallets.length === 0;
  const needsWallet = authenticated && wallets.length === 0 && !user?.google;
  const activeWallet = wallets[0];
  const activeAddress = activeWallet?.address || manualAddress;

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = CAMPAIGN_END.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Campaign ended"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeAddress) scanAddress(activeAddress);
  }, [activeAddress]);

  async function scanAddress(addr: string) {
    setScanning(true);
    setStatus("Scanning your Base transactions...");
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`)
      });
      const [count, claimed, bal] = await Promise.all([
        getBaseTxCount(addr),
        publicClient.readContract({ address: AIRDROP_CLAIM_ADDRESS, abi: AIRDROP_CLAIM_ABI, functionName: "hasClaimed", args: [addr as `0x${string}`] }),
        publicClient.readContract({ address: ACTIVE_TOKEN_ADDRESS, abi: ACTIVE_TOKEN_ABI, functionName: "balanceOf", args: [addr as `0x${string}`] })
      ]);
      setTxCount(count as number);
      setTokenAmount((count as number) * 3);
      setHasClaimed(claimed as boolean);
      setBalance(formatEther(bal as bigint));
      setStatus("");
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
    setScanning(false);
  }

  async function handleClaim() {
    if (!activeWallet || !activeAddress) return;
    setLoading(true);
    try {
      setStatus("Getting signature...");
      const signature = await signClaim(activeAddress, txCount);
      setStatus("Confirm in wallet...");
      await activeWallet.switchChain(8453);
      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: base,
        transport: custom(provider)
      });
      const hash = await walletClient.writeContract({
        address: AIRDROP_CLAIM_ADDRESS,
        abi: AIRDROP_CLAIM_ABI,
        functionName: "claim",
        args: [BigInt(txCount), signature as `0x${string}`],
        value: CLAIM_FEE
      });
      setStatus("TX submitted...");
      const publicClient = createPublicClient({ chain: base, transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`) });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("✅ Claimed successfully!");
      setHasClaimed(true);
      await scanAddress(activeAddress);
    } catch (e: any) {
      setStatus("❌ " + e.message);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen" style={{backgroundColor: "#ffffff"}}>
      <header style={{borderBottom: "1px solid #dbeafe", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
          <div style={{width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#1D6FEB", display: "flex", alignItems: "center", justifyContent: "center"}}>
            <span style={{color: "white", fontWeight: "bold", fontSize: "14px"}}>A</span>
          </div>
          <span style={{fontWeight: "bold", color: "#1e3a8a", fontSize: "18px"}}>Active</span>
        </div>
        {authenticated ? (
          <button onClick={logout} style={{fontSize: "14px", color: "#1D6FEB", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: "8px", background: "white", cursor: "pointer"}}>Disconnect</button>
        ) : (
          <button onClick={login} style={{fontSize: "14px", backgroundColor: "#1D6FEB", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer"}}>Connect</button>
        )}
      </header>

      <div style={{maxWidth: "480px", margin: "0 auto", padding: "48px 24px"}}>
        <div style={{textAlign: "center", marginBottom: "40px"}}>
          <div style={{width: "80px", height: "80px", borderRadius: "16px", background: "linear-gradient(135deg, #3b82f6, #1D6FEB)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px rgba(29,111,235,0.3)"}}>
            <span style={{color: "white", fontWeight: "bold", fontSize: "32px"}}>⚡</span>
          </div>
          <h1 style={{fontSize: "36px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "12px"}}>$ACTIVE Airdrop</h1>
          <p style={{color: "#60a5fa", fontSize: "18px"}}>Claim tokens based on your Base activity</p>
        </div>

        <div style={{backgroundColor: "#1D6FEB", borderRadius: "16px", padding: "24px", textAlign: "center", marginBottom: "24px", boxShadow: "0 10px 25px rgba(29,111,235,0.3)"}}>
          <p style={{color: "#bfdbfe", fontSize: "14px", marginBottom: "8px"}}>Campaign ends in</p>
          <p style={{color: "white", fontWeight: "bold", fontSize: "24px"}}>{timeLeft}</p>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px"}}>
          {[{ label: "Per Tx", value: "3 ACTIVE" }, { label: "Claim Fee", value: "0.00025 ETH" }, { label: "Instant", value: "70%" }].map((s) => (
            <div key={s.label} style={{backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px", textAlign: "center", border: "1px solid #dbeafe"}}>
              <p style={{color: "#1e3a8a", fontWeight: "bold", fontSize: "13px"}}>{s.value}</p>
              <p style={{color: "#93c5fd", fontSize: "12px", marginTop: "4px"}}>{s.label}</p>
            </div>
          ))}
        </div>

        {!authenticated ? (
          <div style={{backgroundColor: "white", border: "2px solid #dbeafe", borderRadius: "16px", padding: "32px", textAlign: "center"}}>
            <p style={{color: "#1e3a8a", fontWeight: "600", marginBottom: "8px"}}>Connect to check eligibility</p>
            <p style={{color: "#93c5fd", fontSize: "14px", marginBottom: "24px"}}>Login with wallet, Farcaster, or Google</p>
            <button onClick={login} style={{width: "100%", backgroundColor: "#1D6FEB", color: "white", padding: "16px", borderRadius: "12px", fontWeight: "600", fontSize: "18px", border: "none", cursor: "pointer"}}>Connect Wallet</button>
          </div>
        ) : needsWallet ? (
          <div style={{backgroundColor: "white", border: "2px solid #dbeafe", borderRadius: "16px", padding: "32px", textAlign: "center"}}>
            <p style={{color: "#1e3a8a", fontWeight: "600", marginBottom: "8px"}}>Connect a wallet to claim</p>
            <p style={{color: "#93c5fd", fontSize: "14px", marginBottom: "24px"}}>Your Farcaster account needs a wallet to receive tokens and pay the claim fee.</p>
            <button onClick={linkWallet} style={{width: "100%", backgroundColor: "#1D6FEB", color: "white", padding: "16px", borderRadius: "12px", fontWeight: "600", fontSize: "16px", border: "none", cursor: "pointer"}}>Connect Wallet</button>
          </div>
        ) : (
          <div style={{backgroundColor: "white", border: "2px solid #dbeafe", borderRadius: "16px", padding: "24px"}}>
            {isGoogleUser && (
              <div style={{marginBottom: "16px"}}>
                <label style={{color: "#1e3a8a", fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "8px"}}>Enter your Base wallet address</label>
                <input type="text" placeholder="0x..." value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                  style={{width: "100%", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", outline: "none", boxSizing: "border-box"}} />
                <button onClick={() => scanAddress(manualAddress)} style={{marginTop: "8px", width: "100%", backgroundColor: "#eff6ff", color: "#1D6FEB", padding: "8px", borderRadius: "12px", fontSize: "14px", fontWeight: "500", border: "none", cursor: "pointer"}}>Scan Address</button>
              </div>
            )}
            {scanning ? (
              <div style={{textAlign: "center", padding: "24px"}}>
                <div style={{width: "32px", height: "32px", border: "2px solid #1D6FEB", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite"}}></div>
                <p style={{color: "#60a5fa", fontSize: "14px"}}>Scanning Base transactions...</p>
              </div>
            ) : activeAddress ? (
              <div>
                <div style={{backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
                  {[
                    { label: "Base Transactions", value: txCount.toLocaleString() },
                    { label: "You will receive", value: `${tokenAmount.toLocaleString()} ACTIVE` },
                    { label: "Instant 70%", value: Math.floor(tokenAmount * 0.7).toLocaleString() },
                    { label: "Vested 30%", value: Math.floor(tokenAmount * 0.3).toLocaleString() }
                  ].map((row) => (
                    <div key={row.label} style={{display: "flex", justifyContent: "space-between", marginBottom: "8px"}}>
                      <span style={{color: "#60a5fa", fontSize: "14px"}}>{row.label}</span>
                      <span style={{color: "#1e3a8a", fontWeight: "bold"}}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {parseFloat(balance) > 0 && (
                  <div style={{backgroundColor: "#1D6FEB", borderRadius: "12px", padding: "12px", marginBottom: "16px", textAlign: "center"}}>
                    <p style={{color: "white", fontSize: "14px"}}>Balance: <strong>{parseFloat(balance).toLocaleString()} ACTIVE</strong></p>
                  </div>
                )}
                {hasClaimed ? (
                  <div style={{backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", textAlign: "center"}}>
                    <p style={{color: "#15803d", fontWeight: "600"}}>✅ Already claimed!</p>
                    <p style={{color: "#4ade80", fontSize: "14px", marginTop: "4px"}}>Vesting unlocks Dec 19, 2026</p>
                  </div>
                ) : txCount === 0 ? (
                  <div style={{backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "16px", textAlign: "center"}}>
                    <p style={{color: "#c2410c", fontWeight: "600"}}>No Base transactions found</p>
                    <p style={{color: "#fb923c", fontSize: "14px", marginTop: "4px"}}>You need Base activity to claim</p>
                  </div>
                ) : (
                  <button onClick={handleClaim} disabled={loading}
                    style={{width: "100%", backgroundColor: loading ? "#93c5fd" : "#1D6FEB", color: "white", padding: "16px", borderRadius: "12px", fontWeight: "600", fontSize: "18px", border: "none", cursor: loading ? "not-allowed" : "pointer"}}>
                    {loading ? "Processing..." : `Claim ${tokenAmount.toLocaleString()} ACTIVE`}
                  </button>
                )}
                {status && <p style={{color: "#60a5fa", fontSize: "12px", textAlign: "center", marginTop: "12px", wordBreak: "break-all"}}>{status}</p>}
              </div>
            ) : null}
          </div>
        )}

        <div style={{marginTop: "24px"}}>
          {[
            { title: "How it works", body: "Every Base transaction earns you 3 $ACTIVE tokens." },
            { title: "Vesting", body: "70% instant. 30% unlocks December 19, 2026." },
            { title: "Trading", body: "Trading starts June 19, 2026 on Base DEXes." }
          ].map((item) => (
            <div key={item.title} style={{border: "1px solid #dbeafe", borderRadius: "12px", padding: "16px", marginBottom: "12px"}}>
              <p style={{color: "#1e3a8a", fontWeight: "600", fontSize: "14px"}}>{item.title}</p>
              <p style={{color: "#93c5fd", fontSize: "14px", marginTop: "4px"}}>{item.body}</p>
            </div>
          ))}
        </div>
        <p style={{textAlign: "center", color: "#bfdbfe", fontSize: "12px", marginTop: "32px"}}>
          {AIRDROP_CLAIM_ADDRESS?.slice(0,6)}...{AIRDROP_CLAIM_ADDRESS?.slice(-4)} · Base Mainnet
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
