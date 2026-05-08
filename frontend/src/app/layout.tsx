import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GhostRoute Terminal",
  description: "Private Cross-Chain Liquidity Execution Terminal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-matrix-bg text-surface-300">{children}</body>
    </html>
  );
}
