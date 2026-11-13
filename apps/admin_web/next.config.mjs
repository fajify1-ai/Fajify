const privateHeaders = [
  { key: 'Cache-Control', value: 'private, no-store' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'none'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];

export default {
  async headers() {
    return [{ source: '/:path*', headers: privateHeaders }];
  },
};
