import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o pacote do banco roda só no servidor
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
