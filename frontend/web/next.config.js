/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { domains: ['localhost', 'via.placeholder.com'] },
  async redirects() {
    return [
      { source: '/login', destination: '/auth-group/login', permanent: false },
      { source: '/register', destination: '/auth-group/register', permanent: false },
      { source: '/products', destination: '/shop-group/products', permanent: false },
      { source: '/products/:slug', destination: '/shop-group/products/:slug', permanent: false },
      { source: '/cart', destination: '/shop-group/cart', permanent: false },
      { source: '/checkout', destination: '/shop-group/checkout', permanent: false },
      { source: '/jobs', destination: '/freelance-group/jobs', permanent: false },
      { source: '/jobs/:id', destination: '/freelance-group/jobs/:id', permanent: false },
      { source: '/profile', destination: '/freelance-group/profile', permanent: false },
      { source: '/proposals', destination: '/freelance-group/proposals', permanent: false },
      { source: '/dashboard', destination: '/dashboard-group', permanent: false },
      { source: '/wallet', destination: '/dashboard-group/wallet', permanent: false },
      { source: '/my-orders', destination: '/dashboard-group/my-orders', permanent: false },
      { source: '/store', destination: '/dashboard-group/store', permanent: false },
      { source: '/kyc', destination: '/admin-group/kyc', permanent: false },
      { source: '/onboarding', destination: '/admin-group/onboarding', permanent: false },
      { source: '/orders', destination: '/admin-group/orders', permanent: false },
      { source: '/payments', destination: '/admin-group/payments', permanent: false },
      { source: '/users', destination: '/admin-group/users', permanent: false },
    ];
  },
};
module.exports = nextConfig;
