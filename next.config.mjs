const buildTarget = process.env.BUILD_TARGET ?? "web";
const isElectronBuild = buildTarget === "electron";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isElectronBuild ? { output: "export" } : {}),
  trailingSlash: isElectronBuild,
};

export default nextConfig;
