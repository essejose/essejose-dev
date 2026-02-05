import Link from 'next/link';
import Image from 'next/image'; // ← ADICIONE ESTA LINHA
import type { Metadata } from "next";
import { MorphingText } from "@/components/ui/morphing-text"
export const metadata: Metadata = {
  title: 'Jogos HTML5',
  description: 'Lista de jogos HTML5 gratuitos - Helicopter Shooter, Pull Birds e mais!',
  openGraph: {
    title: 'Jogos HTML5 | Essejose',
    description: 'Jogos HTML5 gratuitos para jogar no navegador',
    url: 'https://essejose.dev/games',
    siteName: 'Essejose Dev',
    images: [
      {
        url: 'https://essejose.dev/games/shooter/images/poster.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jogos HTML5 | Essejose',
    description: 'Jogos HTML5 gratuitos para jogar no navegador',
    images: ['https://essejose.dev/games/shooter/images/poster.jpg'],
    creator: '@essejose',
  },
};

const games = [
  {
    id: 'shooter',
    title: 'Helicopter Shooter',
    description: 'Control a combat helicopter, defeat enemies and achieve the highest score!',
    image: '/games/shooter/images/poster.jpg',
    url: '/games/shooter',
    tags: ['Action', 'Arcade', 'Shooter'],
    status: 'development',
    progress: 50,
    progressBar: 'bg-green-500', 
  },
//   {
//     id: 'pull-birds',
//     title: 'Pull Birds',
//     description: 'Jogo de pássaros desafiador!',
//     image: '/games/pull-birds/poster.jpg',
//     url: '/games/pull-birds',
//     tags: ['Casual', 'Arcade'],
//   },
//   {
//     id: 'the-fall-of-jack-pro',
//     title: 'The Fall of Jack Pro',
//     description: 'Aventura emocionante!',
//     image: '/games/the-fall-of-jack-pro/poster.jpg',
//     url: '/games/the-fall-of-jack-pro',
//     tags: ['Aventura', 'Plataforma'],
//   },
];

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b    text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-2xl font-bold mb-4">
             <MorphingText texts={["Jogos HTML5", "Jogos HTML5", "Jogos HTML5"]} />
          </h1>
     
        </header>

        <div className="grid grid-cols-1  gap-8">
          {games.map((game) => (
            <Link 
              key={game.id}
              href={game.url}
              className="group bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative h-48 bg-gray-700">
                <Image 
                  src={game.image} 
                  alt={game.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={game.id === 'shooter'}
                />
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white text-lg font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    ▶ Jogar Agora
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                  {game.title}
                </h2>
              
                <p className="text-gray-400 mb-4">
                  {game.description}
                </p>
             
                <div className="flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-blue-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {game.status === 'development' && (
                  <div className="flex items-center gap-2 mt-4 mb-4">
                    <span className="text-xs text-gray-400">Progress:</span>
                    <div className={`w-1/2 h-4 bg-gray-700 rounded-full overflow-hidden relative`}>
                      <div 
                        className="h-full"
                        style={{ width: `${game.progress}%` }}
                      >
                        <div 
                          className={`h-full flex items-center px-2 py-2 justify-end progress-bar-complete ${game.progressBar}`}
                        >
                          <span className="text-xs text-white relative z-10 whitespace-nowrap">{game.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        <footer className="text-center text-xs mt-16 text-gray-400">
          <p>Feito com ❤️ por Essejose</p>
        </footer>
      </div>
    </main>
  );
}