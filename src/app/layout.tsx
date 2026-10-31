import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Study Coach · Mount Kigali University",
    template: "%s · Study Coach",
  },
  description:
    "An AI-based study coach for BBICT and Computer Science students at Mount Kigali University. Ask questions about your lecture notes, get summaries, and revise with material grounded in your own course content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
