/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // 사용자님의 GitHub Pages 주소가 dnahstar.github.io 이므로 
  // basePath와 assetPrefix는 비워두는('') 것이 정답입니다.
  basePath: '', 
  assetPrefix: '',
};

export default nextConfig;
