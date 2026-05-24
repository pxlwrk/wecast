import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "WeCast",
    template: "%s | WeCast",
  },
  description: "Unternehmensinternes Media-Portal für Podcasts und Videos",
  robots: { index: false, follow: false }, // Private portal – no indexing
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
