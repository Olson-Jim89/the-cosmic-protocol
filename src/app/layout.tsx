import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Orbitron, Oxanium } from "next/font/google";
import StarfieldController from "@/components/StarfieldController";
import SiteMain from "@/components/SiteMain";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cosmic Protocol",
  description: "A white-hull sci-fi TTRPG platform built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLoggedIn = false;

  return (
    <html lang="en" className={`${orbitron.variable} ${oxanium.variable}`}>
      <body>
        <StarfieldController />
        <div className="site-shell">
          <header className="topbar">
            <Link href="/" className="brand" aria-label="Cosmic Protocol home">
              <Image src="/logo.png" alt="Cosmic Protocol" width={34} height={34} className="brand-mark" />
              <span>
                <strong>Cosmic Protocol</strong>
                <small>The Age of the Trade Expanse</small>
              </span>
            </Link>
            <nav className="topnav" aria-label="Main navigation">
              <div className="topnav-links">
                <Link href="/">Home</Link>
                <Link href="/rulebook">Rulebook</Link>
                <Link href="/character-sheet">Character Sheet</Link>
                <Link href="/store">Store</Link>
              </div>
              <div className="topnav-auth">
                <Link href={isLoggedIn ? "/play" : "/accounts"}>
                  Play Online
                </Link>
              </div>
              <Link href="/about" className="topnav-about">About Us</Link>
            </nav>
          </header>

          <SiteMain>{children}</SiteMain>

          <footer className="site-footer">
            <div>
              <h3>Cosmic Protocol</h3>
              <p>
                White-hull sci-fi TTRPG website with rulebook access, store support,
                account entry, and multiplayer-ready play surfaces.
              </p>
              <div className="footer-gems" aria-hidden="true">
                <span className="gem red" />
                <span className="gem green" />
                <span className="gem blue" />
                <span className="gem purple" />
                <span className="gem yellow" />
              </div>
            </div>
            <div>
              <h3>Core Links</h3>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/rulebook">Rulebook</Link></li>
                <li><Link href="/store">Store</Link></li>
                <li><Link href="/about">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3>Player Access</h3>
              <p>
                Register and login are available under Accounts. Logged-in users can
                launch play sessions with realtime board interaction and chat.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
