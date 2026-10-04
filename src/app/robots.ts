import type { MetadataRoute } from "next";

import { site } from "@/config/site";

/**
 * Directives pour les robots.
 *
 * Le back-office, l'espace client, le tunnel de commande et l'API ne doivent
 * jamais être indexés : ils contiennent des données de clients, et leur
 * exploration ne sert à rien.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/compte", "/commande", "/connexion", "/api"],
      },
    ],
    sitemap: new URL("/sitemap.xml", site.url).toString(),
    host: site.url,
  };
}
