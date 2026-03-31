/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 정적 배포를 위해 반드시 필요
  images: {
    unoptimized: true, // 이미지 최적화 에러 방지 (핵심!)
  },
  // 경로가 꼬이는 걸 방지하기 위해 추가
  trailingSlash: true,
};

export default nextConfig;
