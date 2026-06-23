import { useUIStore } from '@/store/uiStore';
import { StartPage } from '@/ui/pages/StartPage';
import { CharacterSelectPage } from '@/ui/pages/CharacterSelectPage';
import { GamePage } from '@/ui/pages/GamePage';

export function App() {
  const currentPage = useUIStore((s) => s.currentPage);

  switch (currentPage) {
    case 'start':
      return <StartPage />;
    case 'character-select':
      return <CharacterSelectPage />;
    case 'game':
      return <GamePage />;
    default:
      return <StartPage />;
  }
}
