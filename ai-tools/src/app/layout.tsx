import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI工具箱 — 5大商业级AI能力',
  description: '简历优化、面试教练、内容工厂、合同体检、知识问答',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#0d0d14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
