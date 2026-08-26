import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      // Qualquer subdomínio de imagem do Clerk (ex.: img.clerk.com,
      // images.clerk.com) — o subdomínio exato do CDN de imagens não é uma
      // constante documentada publicamente, então o wildcard evita quebrar
      // de novo se o Clerk usar/mudar pra um subdomínio diferente.
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "*.clerk.com",
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
