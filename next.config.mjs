/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lint runs locally and in CI (npm run lint), not as a deploy gate — the
  // hosted ESLint environment resolves plugin rules differently and can fail
  // on rule names the local config accepts. TypeScript type-checking below is
  // left ON, so real type errors still block the build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      {
        // Private platform: never indexed, on any route.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
