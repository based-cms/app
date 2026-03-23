import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	poweredByHeader: false,

	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.r2.dev',
			},
			{
				protocol: 'https',
				hostname: '*.googleusercontent.com',
			},
			{
				protocol: 'https',
				hostname: 'avatars.githubusercontent.com',
			},
		],
	},

	experimental: {
		optimizePackageImports: ['lucide-react'],
	},

	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline' https://accounts.google.com",
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' data: blob: https://*.r2.dev https://*.googleusercontent.com https://avatars.githubusercontent.com",
							"font-src 'self'",
							"connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://*.r2.cloudflarestorage.com https://accounts.google.com",
							"frame-ancestors 'none'",
							"base-uri 'self'",
							"form-action 'self'",
						].join('; '),
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains',
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
				],
			},
		];
	},
};

export default nextConfig;
