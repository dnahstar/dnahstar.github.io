/** @type {import('next').NextConfig} */
const nextConfig = {
  // 깃허브 페이지 배포를 위해 정적 파일 생성을 활성화합니다.
  output: 'export',
  // 이미지 최적화 기능이 깃허브 서버에서는 작동하지 않으므로 끕니다.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
