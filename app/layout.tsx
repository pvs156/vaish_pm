import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vaishnavi's Job Board",
  description: "Personal PM internship tracker — ranked, filtered, and scored to your resume.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Nav */}
        <nav className="sticky top-0 z-30 bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold tracking-widest text-brand-600 uppercase select-none">VJB</span>
              <span className="text-stone-300 text-xs select-none">|</span>
              <span className="text-sm font-medium text-stone-800 tracking-tight">
                Vaishnavi&rsquo;s Job Board
              </span>
            </Link>
            <div className="flex items-center gap-6 text-[13px] font-medium">
              <Link
                href="/"
                className="text-stone-500 hover:text-stone-900 transition-colors"
              >
                Board
              </Link>
              <Link
                href="/settings"
                className="text-stone-500 hover:text-stone-900 transition-colors"
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
