"use client";
import { usePrivy, useWallets, useFundWallet } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";

const ALCHEMY_RPC = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`;
const ACTIVE_TOKEN = process.env.NEXT_PUBLIC_ACTIVE_TOKEN as `0x${string}`;
const TOKEN_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] }
] as const;

export default function Profile() {
  const { authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();
  const [ethBalance, setEthBalance] = useState("0");
  const [activeBalance, setActiveBalance] = useState("0");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");

  useEffect(() => {
    if (embeddedWallet) fetchBalances(embeddedWallet.address);
  }, [embeddedWallet]);

  async function fetchBalances(address: string) {
    try {
      const publicClient = createPublicClient({ chain: base, transport: http(ALCHEMY_RPC) });
      const [eth, active] = await Promise.all([
        publicClient.getBalance({ address: address as `0x${string}` }),
        publicClient.readContract({ address: ACTIVE_TOKEN, abi: TOKEN_ABI, functionName: "balanceOf", args: [address as `0x${string}`] })
      ]);
      setEthBalance(formatEther(eth));
      setActiveBalance(formatEther(active as bigint));
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFundWallet() {
    if (!embeddedWallet) return;
    await fundWallet(embeddedWallet.address);
  }

  return (
    <main style={{minHeight: "100vh", backgroundColor: "#ffffff"}}>
      <header style={{borderBottom: "1px solid #dbeafe", padding: "16px 24px"}}>
        <span style={{fontWeight: "bold", color: "#1e3a8a", fontSize: "18px"}}>👤 Profile</span>
      </header>

      <div style={{maxWidth: "480px", margin: "0 auto", padding: "32px 24px"}}>
        {!authenticated ? (
          <div style={{textAlign: "center", padding: "40px 0"}}>
            <p style={{color: "#93c5fd", marginBottom: "16px"}}>Connect to view your profile</p>
            <button onClick={login} style={{backgroundColor: "#1D6FEB", color: "white", padding: "14px 32px", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer"}}>Connect</button>
          </div>
        ) : (
          <>
            {/* Login method */}
            <div style={{backgroundColor: "#eff6ff", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px"}}>
              <span style={{fontSize: "20px"}}>{user?.farcaster ? "🟣" : user?.google ? "🔵" : "👛"}</span>
              <div>
                <p style={{color: "#1e3a8a", fontWeight: "600", fontSize: "14px"}}>
                  {user?.farcaster?.displayName || user?.google?.email || "Wallet User"}
                </p>
                <p style={{color: "#93c5fd", fontSize: "12px"}}>
                  {user?.farcaster ? "Farcaster" : user?.google ? "Google" : "Wallet"} login
                </p>
              </div>
            </div>

            {/* Embedded wallet */}
            {embeddedWallet && (
              <div style={{backgroundColor: "white", border: "2px solid #dbeafe", borderRadius: "16px", padding: "20px", marginBottom: "16px"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
                  <p style={{color: "#1e3a8a", fontWeight: "700", fontSize: "15px"}}>Embedded Wallet</p>
                  <span style={{backgroundColor: "#eff6ff", color: "#1D6FEB", fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontWeight: "600"}}>AUTO-CREATED</span>
                </div>

                <div style={{backgroundColor: "#eff6ff", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px"}}>
                  <p style={{color: "#60a5fa", fontSize: "11px", marginBottom: "4px"}}>Address</p>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <p style={{color: "#1e3a8a", fontWeight: "600", fontSize: "13px", fontFamily: "monospace"}}>
                      {embeddedWallet.address.slice(0,10)}...{embeddedWallet.address.slice(-8)}
                    </p>
                    <button onClick={() => copyAddress(embeddedWallet.address)}
                      style={{backgroundColor: "transparent", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "#1D6FEB", cursor: "pointer"}}>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px"}}>
                  <div style={{backgroundColor: "#eff6ff", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{color: "#60a5fa", fontSize: "11px"}}>ETH Balance</p>
                    <p style={{color: "#1e3a8a", fontWeight: "700", fontSize: "15px"}}>{parseFloat(ethBalance).toFixed(6)}</p>
                  </div>
                  <div style={{backgroundColor: "#eff6ff", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{color: "#60a5fa", fontSize: "11px"}}>ACTIVE Balance</p>
                    <p style={{color: "#1e3a8a", fontWeight: "700", fontSize: "15px"}}>{parseFloat(activeBalance).toLocaleString()}</p>
                  </div>
                </div>

                <button onClick={handleFundWallet}
                  style={{width: "100%", backgroundColor: "#1D6FEB", color: "white", padding: "12px", borderRadius: "10px", fontWeight: "600", fontSize: "14px", border: "none", cursor: "pointer", marginBottom: "8px"}}>
                  Add ETH for Gas
                </button>

                <p style={{color: "#93c5fd", fontSize: "11px", textAlign: "center"}}>
                  Fund this wallet with ETH to pay claim fees without connecting MetaMask
                </p>
              </div>
            )}

            {/* External wallet */}
            {externalWallet && (
              <div style={{backgroundColor: "white", border: "1px solid #dbeafe", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
                <p style={{color: "#1e3a8a", fontWeight: "600", fontSize: "14px", marginBottom: "8px"}}>Connected Wallet</p>
                <p style={{color: "#60a5fa", fontSize: "13px", fontFamily: "monospace"}}>
                  {externalWallet.address.slice(0,10)}...{externalWallet.address.slice(-8)}
                </p>
              </div>
            )}

            {status && <p style={{color: "#60a5fa", fontSize: "12px", textAlign: "center"}}>{status}</p>}

            <button onClick={logout}
              style={{width: "100%", backgroundColor: "white", color: "#ef4444", padding: "12px", borderRadius: "12px", fontWeight: "600", fontSize: "14px", border: "1px solid #fecaca", cursor: "pointer", marginTop: "8px"}}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </main>
  );
}
