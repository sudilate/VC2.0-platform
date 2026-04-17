import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "VC Platform",
  description: "Enterprise VC 2.0 platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ margin: 0, fontFamily: "ui-sans-serif, -apple-system, Segoe UI, sans-serif", background: "#f5f7fb", color: "#111827" }}>
        {children}
      </body>
    </html>
  );
}
