import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crate — Good books. The right crowd.",
  description: "A practical packing desk for independent booksellers preparing two cultural pop-ups from one shared stockroom. Developed by Ajnas N B.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
