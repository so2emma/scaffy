import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ToastProvider";

export const metadata: Metadata = {
  title: "Scaffy - ER Diagram to Backend Scaffold Generator",
  description:
    "Visually design ER diagrams and scaffold production-ready backend microservices in one click.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
