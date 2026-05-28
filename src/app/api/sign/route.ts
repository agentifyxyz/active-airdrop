import { createWalletClient, http, hashMessage, keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { address, txCount } = await req.json();

    if (!address || !txCount) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      return NextResponse.json({ error: "Signer not configured" }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);

    // Match contract: keccak256(abi.encodePacked(msg.sender, txCount))
    const messageHash = keccak256(
      encodePacked(["address", "uint256"], [address as `0x${string}`, BigInt(txCount)])
    );

    const signature = await account.signMessage({
      message: { raw: messageHash },
    });

    return NextResponse.json({ signature });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
