import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { GoogleTagManager } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Essejose - Dev",
  description: "Essejose - Dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
     
     <head>

      <script async={true} dangerouslySetInnerHTML={{__html: `
        function detectarIdioma() {
          const lang = navigator.language || navigator.userLanguage;
          return lang.startsWith("pt") ? "pt" : "en";
        }

        const idioma = detectarIdioma();

        if (idioma === "pt") {
          console.log("%c🚀 Olá, Dev curioso!", "font-size: 20px; font-weight: bold; color: #4CAF50;");
          console.log("%cObrigado por explorar o código-fonte!", "font-size: 16px; color: #2196F3;");
          console.log("%cÉ como levantar o capô de um carro e ver o motor funcionando.", "color: #888;"); 
          console.log("%cFeito com 🤖 por Jose", "color: #e91e63;");
        } else {
          console.log("%c🚀 Hello, curious Dev!", "font-size: 20px; font-weight: bold; color: #4CAF50;");
          console.log("%cThanks for checking under the hood!", "font-size: 16px; color: #2196F3;");
          console.log("%cIt’s like lifting the hood and seeing the engine run.", "color: #888;"); 
          console.log("%cMade with 🤖 by Jose", "color: #e91e63;");
        }
        `}} />
     </head>
      <GoogleTagManager gtmId="GTM-W6NSHMJS" /> 
      <body className={inter.className}> 
        {children}
      </body>
      
    </html>
  );
}
