import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mentor-cup-quiz-10.yun-xia.chatgpt.site";
const title = "第十届曼托杯隆胸咨询与测量大赛题库";
const description = "Mentor 第十届曼托杯手机端在线练习题库";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: `${basePath}/mentor-logo.png`, shortcut: `${basePath}/mentor-logo.png` },
  openGraph: { title, description, type: "website", images: [{ url: `${basePath}/og.png`, width: 1536, height: 1024 }] },
  twitter: { card: "summary_large_image", title, description, images: [`${basePath}/og.png`] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
