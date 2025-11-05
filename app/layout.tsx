import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Base Incinerator",
  description: "Burn ERC20, ERC721, ERC1155 on Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
