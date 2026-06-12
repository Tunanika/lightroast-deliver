/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // sharp ships native binaries — keep it external so standalone tracing
  // bundles the platform module instead of trying to inline it.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "archiver", "sharp"],
  eslint: {
    // Linting is run separately; never block a production build on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
