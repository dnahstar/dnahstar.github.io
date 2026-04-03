/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 정적 HTML 배포를 위한 설정 (GitHub Pages 필수)
  output: 'export',

  // 2. 이미지 최적화 기능을 끕니다 (정적 배포 시 에러 방지)
  images: {
    unoptimized: true,
  },

  // 3. (선택사항) 만약 레포지토리 이름이 dnahstar.github.io가 아닌 
  // 다른 이름(예: /my-game)이라면 아래 설정을 추가해야 합니다.
  // basePath: '/your-repo-name',
};

export default nextConfig;
