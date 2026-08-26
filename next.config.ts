import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "img.clerk.com",
      },
      // providerAvatarUrl (SocialProfile) pode vir de externalAccounts[].imageUrl
      // do Google diretamente, não necessariamente proxiada pelo Clerk.
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
