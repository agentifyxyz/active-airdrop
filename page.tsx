cat > src/app/page.tsx << 'EOF'
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
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const [walletAddress, setWalletAddress] = useState<string>("");
  const [manualAddress, setManualAddress] = useState<string>("");
  const [txCount, setTxCount] = useState<number>(0);
  const [tokenAmount, setTokenAmount] = useState<number>(0);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");

  const isGoogleUser = user?.google && !user?.wallet;
  const activeAddress = walletAddress || manualAddress;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = CAMPAIGN_END.getTime() - now.getTime();
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
    if (wallets.length > 0) {
      setWalletAddress(wallets[0].address);
    }
  }, [wallets]);

  useEffect(() => {
    if (activeAddress) {
      scanAddress(activeAddress);
    }
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
        publicClient.readContract({
          address: AIRDROP_CLAIM_ADDRESS,
          abi: AIRDROP_CLAIM_ABI,
          functionName: "hasClaimed",
          args: [addr as `0x${string}`]
        }),
        publicClient.readContract({
          address: ACTIVE_TOKEN_ADDRESS,
          abi: ACTIVE_TOKEN_ABI,
          functionName: "balanceOf",
          args: [addr as `0x${string}`]
        })
      ]);

      setTxCount(count);
      setTokenAmount(count * 3);
      setHasClaimed(claimed as boolean);
      setBalance(formatEther(bal as bigint));
      setStatus("");
    } catch (e: any) {
      setStatus("Error scanning: " + e.message);
    }
    setScanning(false);
  }

  async function handleClaim() {
    if (!activeAddress) return;
    setLoading(true);

    try {
      setStatus("Getting signature...");
      const signature = await signClaim(activeAddress, txCount);

      setStatus("Waiting for wallet confirmation...");
      const wallet = wallets[0];
      await wallet.switchChain(8453);
      const provider = await wallet.getEthereumProvider();

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

      setStatus("Transaction submitted: " + hash);

      const publicClient = createPublicClient({ chain: base, transport: http() });
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("✅ Claimed successfully!");
      setHasClaimed(true);
      await scanAddress(activeAddress);

    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-blue-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-blue-900 text-lg">Active</span>
        </div>
        {authenticated ? (
          <button
            onClick={logout}
            className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={login}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Connect
          </button>
        )}
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-3xl">⚡</span>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-3">$ACTIVE Airdrop</h1>
          <p className="text-blue-500 text-lg">Claim tokens based on your Base activity</p>
        </div>

        {/* Countdown */}
        <div className="bg-blue-600 rounded-2xl p-6 text-center mb-6 shadow-lg shadow-blue-200">
          <p className="text-blue-200 text-sm mb-2">Campaign ends in</p>
          <p className="text-white font-bold text-2xl">{timeLeft}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Per Tx", value: "3 ACTIVE" },
            { label: "Claim Fee", value: "0.00025 ETH" },
            { label: "Instant", value: "70%" }
          ].map((s) => (
            <div key={s.label} className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <p className="text-blue-900 font-bold text-sm">{s.value}</p>
              <p className="text-blue-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main card */}
        {!authenticated ? (
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-8 text-center">
            <p className="text-blue-900 font-semibold mb-2">Connect to check eligibility</p>
            <p className="text-blue-400 text-sm mb-6">Login with wallet, Farcaster, or Google</p>
            <button
              onClick={login}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-6">
            {isGoogleUser && (
              <div className="mb-4">
                <label className="text-blue-900 text-sm font-medium block mb-2">
                  Enter your Base wallet address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => scanAddress(manualAddress)}
                  className="mt-2 w-full bg-blue-50 text-blue-600 py-2 rounded-xl text-sm font-medium hover:bg-blue-100"
                >
                  Scan Address
                </button>
              </div>
            )}

            {scanning ? (
              <div className="text-center py-6">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-blue-500 text-sm">Scanning Base transactions...</p>
              </div>
            ) : activeAddress ? (
              <div>
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-blue-500 text-sm">Base Transactions</span>
                    <span className="text-blue-900 font-bold">{txCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-blue-500 text-sm">You'll receive</span>
                    <span className="text-blue-900 font-bold">{tokenAmount.toLocaleString()} ACTIVE</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-blue-500 text-sm">Instant (70%)</span>
                    <span className="text-blue-900 font-semibold">{Math.floor(tokenAmount * 0.7).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-500 text-sm">Vested (30%)</span>
                    <span className="text-blue-900 font-semibold">{Math.floor(tokenAmount * 0.3).toLocaleString()}</span>
                  </div>
                </div>

                {parseFloat(balance) > 0 && (
                  <div className="bg-blue-600 rounded-xl p-3 mb-4 text-center">
                    <p className="text-white text-sm">Your balance: <strong>{parseFloat(balance).toLocaleString()} ACTIVE</strong></p>
                  </div>
                )}

                {hasClaimed ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-700 font-semibold">✅ Already claimed!</p>
                    <p className="text-green-500 text-sm mt-1">Vesting unlocks Dec 19, 2026</p>
                  </div>
                ) : txCount === 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                    <p className="text-orange-700 font-semibold">No Base transactions found</p>
                    <p className="text-orange-500 text-sm mt-1">You need Base activity to claim</p>
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : `Claim ${tokenAmount.toLocaleString()} ACTIVE`}
                  </button>
                )}

                {status && (
                  <p className="text-blue-500 text-xs text-center mt-3 break-all">{status}</p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 space-y-3">
          {[
            { title: "How it works", body: "We scan your Base wallet history. Every transaction earns you 3 $ACTIVE tokens." },
            { title: "Vesting", body: "70% is yours instantly. 30% unlocks December 19, 2026." },
            { title: "Trading", body: "Trading starts June 19, 2026 on Base DEXes." }
          ].map((item) => (
            <div key={item.title} className="border border-blue-100 rounded-xl p-4">
              <p className="text-blue-900 font-semibold text-sm">{item.title}</p>
              <p className="text-blue-400 text-sm mt-1">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-blue-300 text-xs mt-8">
          Contract: {AIRDROP_CLAIM_ADDRESS?.slice(0, 6)}...{AIRDROP_CLAIM_ADDRESS?.slice(-4)} · Base Mainnet
        </p>
      </div>
    </main>
  );
}
EOF
