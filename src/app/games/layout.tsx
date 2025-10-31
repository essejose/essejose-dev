import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: '%s | Essejose Games',
    default: 'Jogos | Essejose'
  },
  description: 'Jogos HTML5 gratuitos desenvolvidos por Essejose',
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="games-container">
      {children}
    </div>
  );
}