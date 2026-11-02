import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Study Coach · Mount Kigali University",
    template: "%s · Study Coach",
  },
  description:
    "An AI-based study coach for students. Upload your own notes, ask questions grounded in them, get improved notes and summaries, and revise with quizzes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
