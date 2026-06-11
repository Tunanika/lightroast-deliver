/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs", "archiver"],
  eslint: {
    // Linting is run separately; never block a production build on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
