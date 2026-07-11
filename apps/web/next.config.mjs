/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript (main -> src/index.ts); Next must
  // transpile them rather than expecting pre-built dist output.
  transpilePackages: [
    "@helix/shared",
    "@helix/core",
    "@helix/payers",
    "@helix/llm",
    "@helix/agents",
  ],
};

export default nextConfig;
