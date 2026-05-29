import { SNAPSHOT_BLOCK } from "./snapshot";

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const ALCHEMY_RPC = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

export async function getBaseTxCount(address: string): Promise<number> {
  let count = 0;
  let pageKey: string | null = null;

  do {
    const params: any = {
      fromBlock: "0x0",
      toBlock: "0x" + SNAPSHOT_BLOCK.toString(16),
      fromAddress: address,
      category: ["external"],
      excludeZeroValue: false,
      maxCount: "0x3e8"
    };
    if (pageKey) params.pageKey = pageKey;

    const res = await fetch(ALCHEMY_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "alchemy_getAssetTransfers", params: [params] })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    count += data.result?.transfers?.length || 0;
    pageKey = data.result?.pageKey || null;
  } while (pageKey);

  return count;
}

export async function signClaim(address: string, txCount: number): Promise<string> {
  const res = await fetch("/api/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, txCount })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.signature;
}
