import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite"; // Chắc chắn là có dòng import này nhé

export default defineConfig(() => {
  return {
    base: "/tiem-sua-chua/", // Nhớ giữ dòng base này bằng tên repository của bạn
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
