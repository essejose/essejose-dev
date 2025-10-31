'use client'; // ← ADICIONE ESTA LINHA

import type { Metadata } from "next";

 
export default function ShooterPage() {
  return (
    <div className="game-fullscreen">
      <style jsx>{`
        .game-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #000;
        }

        .game-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .back-button {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s;
        }

        .back-button:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-2px);
        }
      `}</style>

      {/* <a href="/games" className="back-button">
        ← Voltar aos Jogos
      </a> */}

      <iframe 
        src="/games/shooter/index.html"
        className="game-iframe"
        title="Helicopter Shooter Game"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="eager"
      />
    </div>
  );
}