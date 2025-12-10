// lib/contract.ts

export const INCINERATOR_ADDRESS = "0x0ef72a5702De1D74b6de42fC9d71041E4a104723";

// ABI minimale per leggere fee/paused e fare le 3 write
export const INCINERATOR_ABI = [
  {
    type: "function",
    name: "BURN_FEE",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "burnErc20",
    inputs: [
      { type: "address", name: "token" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "burnErc721",
    inputs: [
      { type: "address", name: "token" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "burnErc1155",
    inputs: [
      { type: "address", name: "token" },
      { type: "uint256", name: "id" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;
