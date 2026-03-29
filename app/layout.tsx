import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Job Radar",
  description: "PM internship job radar �” personalised, ranked, noise-free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* Nav */}
        <nav className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-700">
              <span>🎯</span>
              <span>Job Radar</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-600 hover:text-brand-700 transition-colors">
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-brand-700 transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
