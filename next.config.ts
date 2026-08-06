import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/mentor-cup-quiz" : "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mentor-cup-quiz-10.yun-xia.chatgpt.site",
    NEXT_PUBLIC_SOURCE_URL: process.env.NEXT_PUBLIC_SOURCE_URL || "",
  },
};

export default nextConfig;
