/** @type {import('next').NextConfig} */
const nextConfig = {
  // prototypes/ = legacy statické HTML, mimo Next build
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
