import type { NextConfig } from 'next';

import { DOCS_SITE_URL } from './lib/docsSiteUrl';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/docs',
        destination: DOCS_SITE_URL,
        permanent: false,
      },
      {
        source: '/docs/:path*',
        destination: DOCS_SITE_URL,
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

export default nextConfig;
