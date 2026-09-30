import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/admin/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eduwa Admin | Content operations",
  description: "Manage Eduwa questions, subjects, students, and campaigns.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
