import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсийг жижиг байлгах — docker-compose доторх app сервис үүнийг ашиглана.
  output: "standalone",
};

export default nextConfig;
