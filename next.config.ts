import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсийг жижиг байлгах — docker-compose доторх app сервис үүнийг ашиглана.
  output: "standalone",
  serverActions: {
    allowedOrigins: ["burtgel.dornogovi.gov.mn", "192.168.137.10:3007"],
  },
};

export default nextConfig;
