export const AIRDROP_CLAIM_ADDRESS = process.env.NEXT_PUBLIC_AIRDROP_CLAIM as `0x${string}`;
export const ACTIVE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ACTIVE_TOKEN as `0x${string}`;
export const VESTING_VAULT_ADDRESS = process.env.NEXT_PUBLIC_VESTING_VAULT as `0x${string}`;

export const AIRDROP_CLAIM_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "txCount", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "hasClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "CLAIM_FEE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "CAMPAIGN_END",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ACTIVE_TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
