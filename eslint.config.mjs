import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Configuration ESLint (format « flat config », ESLint 9).
 *
 * On réutilise les jeux de règles officiels de Next — ils couvrent React, les
 * hooks, l'accessibilité et les pièges du routeur — et on n'y ajoute que deux
 * assouplissements assumés, documentés ci-dessous.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      ".data/**",
      "storage/**",
      "public/**",
      "coverage/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Les photographies servies par `/api/files/...` sont privées et
      // protégées par un jeton : `next/image` ne peut pas les optimiser.
      "@next/next/no-img-element": "warn",
      // Les types `any` qui restent viennent de Drizzle (lignes générées).
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
export default config;
