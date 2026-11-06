import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Painel administrativo: todas as páginas são dinâmicas (dados sempre atuais).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
