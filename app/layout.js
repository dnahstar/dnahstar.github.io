import "./globals.css";
import Script from "next/script"; // Script 컴포넌트 추가

export const metadata = {
  title: "PIONEERS!! - Ring Catcher",
  description: "Grit leads to the Mainnet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 파이 네트워크 SDK 스크립트 (Next.js 권장 방식) */}
        <Script 
          src="https://sdk.minepi.com/pi-sdk.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
