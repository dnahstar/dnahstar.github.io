/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 정적 배포를 위해 반드시 필요
  basePath: '/ring-catcher-game', // 새로운 저장소 이름으로 변경!
  assetPrefix: '/ring-catcher-game', // 자원 경로도 함께 맞춰줍니다
  images: {
    unoptimized: true, // 이미지 최적화 에러 방지
  },
  trailingSlash: true, // 경로가 꼬이는 걸 방지하기 위해 유지
};

export default nextConfig;
