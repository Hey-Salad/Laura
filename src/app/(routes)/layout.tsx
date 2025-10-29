"use client";

import Layout from "@/components/Layout";
import { ToastProvider } from "@/lib/hooks/useToast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Layout>{children}</Layout>
    </ToastProvider>
  );
}
