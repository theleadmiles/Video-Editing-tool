"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#1C1C1C",
          border: "1px solid #242424",
          color: "#ffffff",
        },
      }}
    />
  );
}
