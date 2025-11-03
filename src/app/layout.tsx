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
          console.log("%c╔══════════════════════════════════════════╗", "color:#00e676;");
          console.log("%c║ 🚀 Olá, Dev curioso!                     ║", "color:#00e676; font-weight:bold;");
          console.log("%c║ 👀 Vendo o console? Isso é um bom sinal! ║", "color:#00e676;");
          console.log("%c║ 🧠 Aqui é onde a mágica acontece.        ║", "color:#00e676;");
          console.log("%c║ 💻 Feito com 🤖 e ☕ por Jose             ║", "color:#00e676;");
          console.log("%c╚══════════════════════════════════════════╝", "color:#00e676;");
          console.log("%c💡 Dica: tente digitar %cgetSecret() %c😉", "color:#888;", "color:#2196F3; font-weight:bold;", "color:#888;");
        } else {
          console.log("%c╔══════════════════════════════════════════╗", "color:#00e676;");
          console.log("%c║ 🚀 Hello, curious Dev!                   ║", "color:#00e676; font-weight:bold;");
          console.log("%c║ 👀 Peeking at the console? Nice move!    ║", "color:#00e676;");
          console.log("%c║ 🧠 This is where the magic happens.      ║", "color:#00e676;");
          console.log("%c║ 💻 Made with 🤖 and ☕ by Jose            ║", "color:#00e676;");
          console.log("%c╚══════════════════════════════════════════╝", "color:#00e676;");
          console.log("%c💡 Tip: try typing %cgetSecret() %c😉", "color:#888;", "color:#2196F3; font-weight:bold;", "color:#888;");
        }

        // Opcional: easter egg interativo
        window.getSecret = () => {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            'event': 'easter_egg',
            'event_category': 'easter_egg',
            'event_label': 'get_secret'
          });
        if (idioma === "pt") {
          console.log("%c╔═══════════════════════════════════════════════════════════╗", "color:#00e676;");
          console.log("%c║ 🔮 O segredo é simples: não existe ingrediente secreto 🐼║", "color:#00e676; font-weight:bold;");
            console.log("%c║ ✨ Aprender, quebrar e criar — é assim que se evolui. ║", "color:#00e676;");
            console.log("%c╚═════════════════════════════════════════════════════════╝", "color:#00e676;");
          } else {
            console.log("%c╔═══════════════════════════════════════════════════════════╗", "color:#00e676;");
            console.log("%c║ 🔮 The secret is simple: there is no secret ingredient 🐼║", "color:#00e676; font-weight:bold;");
            console.log("%c║ ✨ Learn, break, and create — that’s how you evolve.    ║", "color:#00e676;");
            console.log("%c╚══════════════════════════════════════════════════════════╝", "color:#00e676;");
          }
        };
        `}} />
     </head>
      <GoogleTagManager gtmId="GTM-W6NSHMJS" /> 
      <body className={inter.className}> 
        {children}
      </body>
      
    </html>
  );
}
