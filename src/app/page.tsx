"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { base } from "viem/chains";
import { getBaseTxCount, signClaim } from "@/lib/alchemy";
import { SNAPSHOT_DATE } from "@/lib/snapshot";
import { AIRDROP_CLAIM_ADDRESS, AIRDROP_CLAIM_ABI } from "@/lib/contracts";

const CLAIM_FEE = parseEther("0.00025");
const CAMPAIGN_END = new Date("2026-06-17T00:00:00Z");
const ALCHEMY_RPC = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`;

export default function Home() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [scanAddress, setScanAddress] = useState("");
  const [txCount, setTxCount] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState("");

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
  const externalWallet = wallets.find(w => w.walletClientType !== "privy");
  const signerWallet = externalWallet || embeddedWallet;

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

  async function handleScan() {
    if (!scanAddress || !scanAddress.startsWith("0x")) {
      setStatus("Enter a valid 0x address");
      return;
    }
    setScanning(true);
    setScanned(false);
    setStatus("");
    try {
      const publicClient = createPublicClient({ chain: base, transport: http(ALCHEMY_RPC) });
      const [count, claimed] = await Promise.all([
        getBaseTxCount(scanAddress),
        publicClient.readContract({
          address: AIRDROP_CLAIM_ADDRESS,
          abi: AIRDROP_CLAIM_ABI,
          functionName: "hasClaimed",
          args: [scanAddress as `0x${string}`]
        })
      ]);
      setTxCount(count as number);
      setTokenAmount((count as number) * 3);
      setHasClaimed(claimed as boolean);
      setScanned(true);
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
    setScanning(false);
  }

  async function handleClaim() {
    if (!signerWallet || !scanAddress) return;
    setLoading(true);
    try {
      setStatus("Getting signature...");
      const signature = await signClaim(scanAddress, txCount);
      setStatus("Confirm in wallet...");
      await signerWallet.switchChain(8453);
      const provider = await signerWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: signerWallet.address as `0x${string}`,
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
      setStatus("Confirming...");
      const publicClient = createPublicClient({ chain: base, transport: http(ALCHEMY_RPC) });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("✅ Claimed!");
      setHasClaimed(true);
    } catch (e: any) {
      setStatus("❌ " + e.message);
    }
    setLoading(false);
  }

  return (
    <main style={{minHeight:"100vh",backgroundColor:"#ffffff"}}>
      <header style={{borderBottom:"1px solid #dbeafe",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",borderRadius:"8px",backgroundColor:"#1D6FEB",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"white",fontWeight:"bold",fontSize:"14px"}}>A</span>
          </div>
          <span style={{fontWeight:"bold",color:"#1e3a8a",fontSize:"18px"}}>Active</span>
        </div>
        {!authenticated ? (
          <button onClick={login} style={{fontSize:"14px",backgroundColor:"#1D6FEB",color:"white",padding:"8px 16px",borderRadius:"8px",border:"none",cursor:"pointer"}}>Connect</button>
        ) : signerWallet ? (
          <div style={{fontSize:"12px",color:"#1D6FEB",backgroundColor:"#eff6ff",padding:"6px 12px",borderRadius:"8px"}}>
            {signerWallet.address.slice(0,6)}...{signerWallet.address.slice(-4)}
          </div>
        ) : null}
      </header>

      <div style={{maxWidth:"480px",margin:"0 auto",padding:"24px"}}>
        <div style={{backgroundColor:"#1D6FEB",borderRadius:"16px",padding:"20px 24px",marginBottom:"20px",boxShadow:"0 10px 25px rgba(29,111,235,0.25)"}}>
          <p style={{color:"#bfdbfe",fontSize:"13px",marginBottom:"4px"}}>Campaign ends in</p>
          <p style={{color:"white",fontWeight:"bold",fontSize:"22px"}}>{timeLeft}</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"20px"}}>
          {[{label:"Per Tx",value:"3 ACTIVE"},{label:"Claim Fee",value:"0.00025 ETH"},{label:"Instant",value:"70%"}].map((s)=>(
            <div key={s.label} style={{backgroundColor:"#eff6ff",borderRadius:"12px",padding:"14px",textAlign:"center",border:"1px solid #dbeafe"}}>
              <p style={{color:"#1e3a8a",fontWeight:"bold",fontSize:"13px"}}>{s.value}</p>
              <p style={{color:"#93c5fd",fontSize:"11px",marginTop:"4px"}}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{backgroundColor:"#eff6ff",border:"1px solid #dbeafe",borderRadius:"12px",padding:"12px 16px",marginBottom:"20px",fontSize:"13px",color:"#60a5fa"}}>
          📸 Snapshot: <strong style={{color:"#1D6FEB"}}>{SNAPSHOT_DATE}</strong> — only Base txs before this date count.
        </div>

        <div style={{marginBottom:"20px"}}>
          <label style={{color:"#1e3a8a",fontSize:"14px",fontWeight:"600",display:"block",marginBottom:"8px"}}>
            Enter any Base wallet to check
          </label>
          <div style={{display:"flex",gap:"8px"}}>
            <input
              type="text"
              placeholder="0x..."
              value={scanAddress}
              onChange={(e)=>setScanAddress(e.target.value)}
              style={{flex:1,border:"1px solid #bfdbfe",borderRadius:"10px",padding:"12px 14px",fontSize:"14px",outline:"none"}}
            />
            <button
              onClick={handleScan}
              disabled={scanning}
              style={{backgroundColor:"#1D6FEB",color:"white",border:"none",borderRadius:"10px",padding:"12px 20px",fontWeight:"600",cursor:"pointer"}}>
              {scanning ? "..." : "Scan"}
            </button>
          </div>
          {status && !scanned && <p style={{color:"#ef4444",fontSize:"12px",marginTop:"6px"}}>{status}</p>}
        </div>

        {scanned && (
          <div style={{backgroundColor:"white",border:"2px solid #dbeafe",borderRadius:"16px",padding:"20px",marginBottom:"20px"}}>
            <div style={{backgroundColor:"#eff6ff",borderRadius:"12px",padding:"16px",marginBottom:"16px"}}>
              {[
                {label:"Base Transactions",value:txCount.toLocaleString()},
                {label:"You will receive",value:`${tokenAmount.toLocaleString()} ACTIVE`},
                {label:"Instant 70%",value:Math.floor(tokenAmount*0.7).toLocaleString()},
                {label:"Vested 30%",value:Math.floor(tokenAmount*0.3).toLocaleString()}
              ].map((row)=>(
                <div key={row.label} style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                  <span style={{color:"#60a5fa",fontSize:"14px"}}>{row.label}</span>
                  <span style={{color:"#1e3a8a",fontWeight:"bold"}}>{row.value}</span>
                </div>
              ))}
            </div>

            {hasClaimed ? (
              <div style={{backgroundColor:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"12px",padding:"14px",textAlign:"center"}}>
                <p style={{color:"#15803d",fontWeight:"600"}}>✅ Already claimed!</p>
                <p style={{color:"#4ade80",fontSize:"13px",marginTop:"4px"}}>Vesting unlocks Dec 19, 2026</p>
              </div>
            ) : txCount === 0 ? (
              <div style={{backgroundColor:"#fff7ed",border:"1px solid #fed7aa",borderRadius:"12px",padding:"14px",textAlign:"center"}}>
                <p style={{color:"#c2410c",fontWeight:"600"}}>No transactions before snapshot</p>
                <p style={{color:"#fb923c",fontSize:"13px",marginTop:"4px"}}>Snapshot: {SNAPSHOT_DATE}</p>
              </div>
            ) : !authenticated ? (
              <button onClick={login} style={{width:"100%",backgroundColor:"#1D6FEB",color:"white",padding:"14px",borderRadius:"12px",fontWeight:"600",fontSize:"16px",border:"none",cursor:"pointer"}}>
                Login to Claim
              </button>
            ) : !signerWallet ? (
              <p style={{color:"#93c5fd",fontSize:"13px",textAlign:"center"}}>Loading wallet...</p>
            ) : (
              <>
                <div style={{backgroundColor:"#eff6ff",borderRadius:"10px",padding:"10px 14px",marginBottom:"12px",fontSize:"12px",color:"#60a5fa"}}>
                  {externalWallet
                    ? `Signing with: ${externalWallet.address.slice(0,6)}...${externalWallet.address.slice(-4)} (connected wallet)`
                    : `Signing with: ${embeddedWallet?.address.slice(0,6)}...${embeddedWallet?.address.slice(-4)} (embedded wallet)`}
                </div>
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  style={{width:"100%",backgroundColor:loading?"#93c5fd":"#1D6FEB",color:"white",padding:"14px",borderRadius:"12px",fontWeight:"600",fontSize:"16px",border:"none",cursor:loading?"not-allowed":"pointer"}}>
                  {loading ? "Processing..." : `Claim ${tokenAmount.toLocaleString()} ACTIVE`}
                </button>
                {status && <p style={{color:"#60a5fa",fontSize:"12px",textAlign:"center",marginTop:"10px",wordBreak:"break-all"}}>{status}</p>}
              </>
            )}
          </div>
        )}

        <div style={{marginTop:"8px"}}>
          {[
            {title:"How it works",body:"Enter any Base wallet. Every transaction before the snapshot earns 3 $ACTIVE tokens."},
            {title:"Vesting",body:"70% instant. 30% unlocks December 19, 2026."},
            {title:"Trading",body:"Trading starts June 19, 2026 on Base DEXes."}
          ].map((item)=>(
            <div key={item.title} style={{border:"1px solid #dbeafe",borderRadius:"12px",padding:"16px",marginBottom:"10px"}}>
              <p style={{color:"#1e3a8a",fontWeight:"600",fontSize:"14px"}}>{item.title}</p>
              <p style={{color:"#93c5fd",fontSize:"13px",marginTop:"4px"}}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
