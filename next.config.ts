import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gallery photos are delivered by Cloudinary.
    //
    // ponytail: next/image re-optimises what Cloudinary could transform on its
    // own. Fine at this volume; if Vercel's optimisation quota ever bites,
    // bake `f_auto,q_auto,w_…` into the delivery URL and pass `unoptimized`.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
