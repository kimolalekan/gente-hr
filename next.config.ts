import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The theme system applies CSS variables at runtime, so pages are rendered
  // per-request to reflect the tenant's latest saved theme (see `dynamic` in
  // the root layout). Lint runs via `npm run lint` rather than blocking builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
