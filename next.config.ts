import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Le serveur de développement refuse par défaut les ressources demandées
  // depuis une autre origine — ce qui coupe le rechargement à chaud quand on
  // travaille derrière un domaine de prévisualisation.
  allowedDevOrigins: ["*.e2b.app", "*.vercel.app", "localhost"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Les photos clients sont servies par /api/files/[id] (même origine) :
    // aucune remotePattern nécessaire, donc aucun domaine tiers autorisé.
  },
  serverExternalPackages: ["sharp", "@electric-sql/pglite", "postgres"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Contre le clickjacking, sans pour autant casser l'aperçu : le site
          // peut être encadré par lui-même (production) et par la
          // prévisualisation de l'environnement de travail (*.e2b.app).
          // `frame-ancestors` remplace X-Frame-Options, trop binaire : DENY
          // rendait la prévisualisation blanche.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.e2b.app https://*.vercel.app",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
