/** @type {import('next').NextConfig} */
const nextConfig = {
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
