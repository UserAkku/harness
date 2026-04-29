import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "harness — Virtual Embedded Systems Platform",
  description: "Test your device logic. No hardware needed. A browser-based behavioral simulator for embedded systems.",
  keywords: ["embedded systems", "firmware testing", "IoT simulator", "fault injection", "behavioral simulation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
