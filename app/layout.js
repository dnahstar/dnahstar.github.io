import "./globals.css";

export const metadata = {
  title: "PIONEERS!! - Ring Catcher",
  description: "Grit leads to the Mainnet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 파이 네트워크 SDK 스크립트 (필수!) */}
        <script src="https://sdk.minepi.com/pi-sdk.js" defer></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
