"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, parseUnits, isAddress, BaseError, Hex } from "viem";
import { baseSepolia } from "wagmi/chains";
import { INCINERATOR_ADDRESS, INCINERATOR_ABI } from "@/lib/contract";
import {
  ERC20_ABI,
  ERC165_ABI,
  ERC721_EXTRA_ABI,
  ERC1155_EXTRA_ABI,
} from "@/lib/abis";

type TokenType = "erc20" | "erc721" | "erc1155" | "unknown";

const IFACE_ERC721 = "0x80ac58cd";
const IFACE_ERC1155 = "0xd9b67a26";

export default function BurnForm() {
  const { address } = useAccount();
  const pc = usePublicClient();

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeErr,
  } = useWriteContract();

  const [tokenAddr, setTokenAddr] = useState<string>("");
  const tokenAddrValid = isAddress(tokenAddr);
  const tokenAddrHex = (tokenAddrValid ? tokenAddr : undefined) as
    | `0x${string}`
    | undefined;

  const [tokenType, setTokenType] = useState<TokenType>("unknown");
  const [amountStr, setAmountStr] = useState<string>(""); // ERC20 amount or ERC1155 qty
  const [tokenIdStr, setTokenIdStr] = useState<string>(""); // 721/1155 id
  const [feeWei, setFeeWei] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(18);

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash as Hex | undefined,
  });

  // Approval flags
  const [needApprove20, setNeedApprove20] = useState(false);
  const [needApprove721, setNeedApprove721] = useState(false);
  const [needApprove1155, setNeedApprove1155] = useState(false);

  // Read fee once
  useEffect(() => {
    (async () => {
      if (!pc) return;
      try {
        const v = (await pc.readContract({
          address: INCINERATOR_ADDRESS,
          abi: INCINERATOR_ABI,
          functionName: "BURN_FEE",
        })) as bigint;
        setFeeWei(v);
      } catch {
        setFeeWei(null);
      }
    })();
  }, [pc]);

  // Detect token standard
  const detect = async () => {
    if (!pc || !tokenAddrHex) {
      setTokenType("unknown");
      return;
    }
    try {
      const is721 = (await pc
        .readContract({
          address: tokenAddrHex,
          abi: ERC165_ABI,
          functionName: "supportsInterface",
          args: [IFACE_ERC721],
        })
        .catch(() => false)) as boolean;
      if (is721) {
        setTokenType("erc721");
        return;
      }

      const is1155 = (await pc
        .readContract({
          address: tokenAddrHex,
          abi: ERC165_ABI,
          functionName: "supportsInterface",
          args: [IFACE_ERC1155],
        })
        .catch(() => false)) as boolean;
      if (is1155) {
        setTokenType("erc1155");
        return;
      }

      const dec = (await pc
        .readContract({
          address: tokenAddrHex,
          abi: ERC20_ABI,
          functionName: "decimals",
        })
        .catch(() => null)) as number | null;
      if (dec !== null) {
        setDecimals(dec);
        setTokenType("erc20");
        return;
      }

      setTokenType("unknown");
    } catch {
      setTokenType("unknown");
    }
  };

  // Approve need for ERC20
  useEffect(() => {
    (async () => {
      if (
        !pc ||
        tokenType !== "erc20" ||
        !address ||
        !amountStr ||
        !tokenAddrHex
      ) {
        setNeedApprove20(false);
        return;
      }
      try {
        const amountWei = parseUnits(amountStr, decimals);
        const allowance = (await pc.readContract({
          address: tokenAddrHex,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, INCINERATOR_ADDRESS],
        })) as bigint;
        setNeedApprove20(allowance < amountWei);
      } catch {
        setNeedApprove20(true);
      }
    })();
  }, [pc, tokenType, address, amountStr, tokenAddrHex, decimals]);

  // Approve need for ERC721
  useEffect(() => {
    (async () => {
      if (
        !pc ||
        tokenType !== "erc721" ||
        !address ||
        !tokenAddrHex ||
        !tokenIdStr
      ) {
        setNeedApprove721(false);
        return;
      }
      try {
        const approved = (await pc.readContract({
          address: tokenAddrHex,
          abi: ERC721_EXTRA_ABI,
          functionName: "getApproved",
          args: [BigInt(tokenIdStr)],
        })) as `0x${string}`;
        if (
          approved &&
          approved.toLowerCase() === INCINERATOR_ADDRESS.toLowerCase()
        ) {
          setNeedApprove721(false);
          return;
        }
        const isAll = (await pc.readContract({
          address: tokenAddrHex,
          abi: ERC721_EXTRA_ABI,
          functionName: "isApprovedForAll",
          args: [address, INCINERATOR_ADDRESS],
        })) as boolean;
        setNeedApprove721(!isAll);
      } catch {
        setNeedApprove721(true);
      }
    })();
  }, [pc, tokenType, address, tokenAddrHex, tokenIdStr]);

  // Approve need for ERC1155
  useEffect(() => {
    (async () => {
      if (!pc || tokenType !== "erc1155" || !address || !tokenAddrHex) {
        setNeedApprove1155(false);
        return;
      }
      try {
        const isAll = (await pc.readContract({
          address: tokenAddrHex,
          abi: ERC1155_EXTRA_ABI,
          functionName: "isApprovedForAll",
          args: [address, INCINERATOR_ADDRESS],
        })) as boolean;
        setNeedApprove1155(!isAll);
      } catch {
        setNeedApprove1155(true);
      }
    })();
  }, [pc, tokenType, address, tokenAddrHex]);

  // Actions
  const onApprove20 = async () => {
    if (!tokenAddrHex) return;
    const amountWei = parseUnits(amountStr || "0", decimals);
    await writeContract({
      address: tokenAddrHex,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [INCINERATOR_ADDRESS, amountWei],
    });
  };

  const onApprove721 = async () => {
    if (!tokenAddrHex) return;
    await writeContract({
      address: tokenAddrHex,
      abi: ERC721_EXTRA_ABI,
      functionName: "setApprovalForAll",
      args: [INCINERATOR_ADDRESS, true],
    });
  };

  const onApprove1155 = async () => {
    if (!tokenAddrHex) return;
    await writeContract({
      address: tokenAddrHex,
      abi: ERC1155_EXTRA_ABI,
      functionName: "setApprovalForAll",
      args: [INCINERATOR_ADDRESS, true],
    });
  };

  const onBurn = async () => {
    if (!feeWei || !tokenAddrHex) return;

    if (tokenType === "erc20") {
      const amountWei = parseUnits(amountStr || "0", decimals);
      await writeContract({
        address: INCINERATOR_ADDRESS,
        abi: INCINERATOR_ABI,
        functionName: "burnErc20",
        args: [tokenAddrHex, amountWei],
        value: feeWei,
      });
    } else if (tokenType === "erc721") {
      const tokenId = BigInt(tokenIdStr || "0");
      await writeContract({
        address: INCINERATOR_ADDRESS,
        abi: INCINERATOR_ABI,
        functionName: "burnErc721",
        args: [tokenAddrHex, tokenId],
        value: feeWei,
      });
    } else if (tokenType === "erc1155") {
      const tokenId = BigInt(tokenIdStr || "0");
      const qty = BigInt(amountStr || "0");
      await writeContract({
        address: INCINERATOR_ADDRESS,
        abi: INCINERATOR_ABI,
        functionName: "burnErc1155",
        args: [tokenAddrHex, tokenId, qty],
        value: feeWei,
      });
    }
  };

  const explorerBase =
    baseSepolia.blockExplorers?.default?.url ?? "https://sepolia.basescan.org";
  const txUrl = txHash ? `${explorerBase}/tx/${txHash}` : undefined;

  const errMsg =
    (writeErr as BaseError | undefined)?.shortMessage ||
    (writeErr as Error | undefined)?.message ||
    "";

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="grid gap-3">
        <label className="text-sm opacity-80">Token address</label>
        <input
          className="border rounded-xl p-3 bg-transparent"
          placeholder="0x..."
          value={tokenAddr}
          onChange={(e) => setTokenAddr(e.target.value.trim())}
        />
        <button
          onClick={detect}
          className="rounded-xl border px-4 py-2"
          disabled={!tokenAddrValid || isPending}
        >
          Detect
        </button>
        <p className="text-sm opacity-70">
          Detected: {tokenType.toUpperCase()}
        </p>
      </div>

      {tokenType === "erc20" && (
        <div className="grid gap-3">
          <label className="text-sm opacity-80">
            Amount ({decimals} decimals)
          </label>
          <input
            className="border rounded-xl p-3 bg-transparent"
            placeholder="e.g. 10.5"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
      )}

      {tokenType === "erc721" && (
        <div className="grid gap-3">
          <label className="text-sm opacity-80">Token ID</label>
          <input
            className="border rounded-xl p-3 bg-transparent"
            placeholder="e.g. 1234"
            value={tokenIdStr}
            onChange={(e) => setTokenIdStr(e.target.value)}
          />
        </div>
      )}

      {tokenType === "erc1155" && (
        <div className="grid gap-3">
          <label className="text-sm opacity-80">Token ID</label>
          <input
            className="border rounded-xl p-3 bg-transparent"
            placeholder="e.g. 1"
            value={tokenIdStr}
            onChange={(e) => setTokenIdStr(e.target.value)}
          />
          <label className="text-sm opacity-80">Quantity</label>
          <input
            className="border rounded-xl p-3 bg-transparent"
            placeholder="e.g. 5"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        {tokenType === "erc20" && needApprove20 && (
          <button
            onClick={onApprove20}
            disabled={isPending || !tokenAddrValid}
            className="rounded-xl border px-4 py-2"
          >
            Approve ERC20
          </button>
        )}

        {tokenType === "erc721" && needApprove721 && (
          <button
            onClick={onApprove721}
            disabled={isPending || !tokenAddrValid || !tokenIdStr}
            className="rounded-xl border px-4 py-2"
          >
            Approve ERC721 (setApprovalForAll)
          </button>
        )}

        {tokenType === "erc1155" && needApprove1155 && (
          <button
            onClick={onApprove1155}
            disabled={isPending || !tokenAddrValid}
            className="rounded-xl border px-4 py-2"
          >
            Approve ERC1155 (setApprovalForAll)
          </button>
        )}

        <button
          onClick={onBurn}
          disabled={
            !feeWei || isPending || tokenType === "unknown" || !tokenAddrValid
          }
          className="rounded-xl border px-4 py-2"
        >
          {isPending ? "Burning..." : "Burn"}
        </button>

        {txUrl && (
          <a
            className="text-sm underline"
            href={txUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on BaseScan
          </a>
        )}
      </div>

      {!!errMsg && <p className="text-red-500 text-sm">{errMsg}</p>}
      {receipt && (
        <p className="text-green-500 text-sm">
          Confirmed in block #{receipt.blockNumber?.toString()}
        </p>
      )}

      {feeWei && (
        <p className="text-xs opacity-60">
          Burn fee: {formatEther(feeWei)} ETH
        </p>
      )}
    </div>
  );
}
