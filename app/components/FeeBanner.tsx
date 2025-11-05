"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { INCINERATOR_ADDRESS, INCINERATOR_ABI } from "@/lib/contract";

export default function FeeBanner() {
  const { data, isLoading, isError } = useReadContract({
    address: INCINERATOR_ADDRESS as `0x${string}`,
    abi: INCINERATOR_ABI,
    functionName: "BURN_FEE",
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border p-3 text-sm opacity-80">
        Lettura fee...
      </div>
    );
  }

  if (isError || data === undefined) {
    return (
      <div className="rounded-xl border p-3 text-sm text-red-500">
        Errore nel leggere la fee. Riprova.
      </div>
    );
  }

  const feeEth = formatEther(data as bigint);

  return (
    <div className="rounded-xl border p-4 text-center">
      <p className="text-sm opacity-80">Burn fee</p>
      <p className="text-2xl font-semibold">{feeEth} ETH</p>
      <p className="text-xs opacity-60 mt-1">
        La fee è fissa e deve essere inviata con ogni burn.
      </p>
    </div>
  );
}
