export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  score: number;
  rank: number;
  isHost?: boolean;
}

export interface CreditsData {
  framesByTitle?: string;
  framesBy: string;
  websiteByTitle?: string;
  websiteBy: string;
}

export interface ActionCallbacks {
  onPlayAgain?: () => void;
  onRematch?: () => void;
  onReturnLobby?: () => void;
}

export interface WinnerPageProps {
  players: Player[];
  message?: string;
  credits?: CreditsData;
  actions?: ActionCallbacks;
  title?: string;
  className?: string;
}
