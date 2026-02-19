import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-jp",
});

export const metadata: Metadata = {
  title: "Recode",
  description: "テレアポ音声を自動文字起こし",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSerifJP.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
