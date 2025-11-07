// lib/abis.ts
export const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address", name: "owner" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC165_ABI = [
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ type: "bytes4", name: "interfaceId" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

export const ERC721_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      { type: "address", name: "from" },
      { type: "address", name: "to" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC1155_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      { type: "address", name: "from" },
      { type: "address", name: "to" },
      { type: "uint256", name: "id" },
      { type: "uint256", name: "amount" },
      { type: "bytes", name: "data" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC721_EXTRA_ABI = [
  {
    type: "function",
    name: "getApproved",
    inputs: [{ type: "uint256", name: "tokenId" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "operator" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { type: "address", name: "operator" },
      { type: "bool", name: "approved" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC1155_EXTRA_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "operator" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { type: "address", name: "operator" },
      { type: "bool", name: "approved" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
