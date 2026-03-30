/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove output: 'export' to fix the error and allow middleware
    images: {
        unoptimized: true
    }
};
export default nextConfig;
