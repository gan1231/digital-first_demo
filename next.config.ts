import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker дүрсийг жижиг байлгах — docker-compose доторх app сервис үүнийг ашиглана.
  output: "standalone",
  serverActions: {
<<<<<<< HEAD
    allowedOrigins: ["burtgel.dornogovi.gov.mn", "192.168.137.10:3007"],
=======
    allowedOrigins: ["burtgel.dornogovi.gov.mn"],
>>>>>>> 46a4aa2ba03e345ecf4761c2a47813b56ceac224
  },
};

export default nextConfig;
