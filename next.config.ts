import type { NextConfig } from "next";

/**
 * Content-Security-Policy: everything (scripts, styles, images, fonts, requests) must come from the site itself; no
 * plugins, no framing, forms only post to the site. Inline scripts/styles stay allowed: Next.js needs them unless every
 * page gets a per-request nonce, which would turn off static rendering. Production only (dev tooling needs eval).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // OpenCV (notes scanner) is a large WebAssembly build: load it from node_modules at runtime, not bundled.
  serverExternalPackages: ["@techstark/opencv-js"],
  // …and since it is required at runtime, ship it explicitly in the standalone build (pages using the scanner).
  outputFileTracingIncludes: {
    "/contacts/**": ["./node_modules/@techstark/opencv-js/package.json", "./node_modules/@techstark/opencv-js/dist/opencv.js"],
  },
  experimental: {
    // Documents are capped at 10 MB (see lib/validations/documents.ts); leave room for form overhead.
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
