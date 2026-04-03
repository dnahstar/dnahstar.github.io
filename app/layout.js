import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "PIONEERS!! - Ring Catcher 2.0",
  description: "Grit leads to the Mainnet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* strategy="beforeInteractive"를 써야 팝업 차단을 피할 수 있습니다 */}
        <Script 
          src="https://sdk.minepi.com/pi-sdk.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
