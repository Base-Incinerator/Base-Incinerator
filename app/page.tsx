"use client";

import { useState, Suspense } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import BurnForm from "./components/BurnForm";
import { MagmaBadge } from "./components/MagmaBadge";
import { IncineratorFooterLinks } from "./components/IncineratorFooterLinks";

export default function Home() {
  const [magmaRefreshKey, setMagmaRefreshKey] = useState(0);

  const handleBurnCompleted = () => {
    setMagmaRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 p-6">
      <h1 className="text-3xl font-bold">Base Incinerator</h1>

      <MagmaBadge refreshKey={magmaRefreshKey} />

      <ConnectButton />

      <Suspense fallback={null}>
        <BurnForm onBurnCompleted={handleBurnCompleted} />
      </Suspense>

      <IncineratorFooterLinks />
    </main>
  );
}
