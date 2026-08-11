import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсийг жижиг байлгах — docker-compose доторх app сервис үүнийг ашиглана.
  output: "standalone",
  serverActions: {
    allowedOrigins: ["burtgel.dornogovi.gov.mn"],
  },
};

export default nextConfig;
