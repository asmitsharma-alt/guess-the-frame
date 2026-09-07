# Neo-Brutalist Winner Page Component System

A modular, production-ready Victory / Winner Page component suite built with **React**, **TypeScript**, and **Tailwind CSS**. Designed specifically for multiplayer party and guessing games with bold outlines, thick borders, playful cartoon colors, and a clean Neo-Brutalist aesthetic.

---

## 📦 Component Architecture

```text
src/components/WinnerPage/
├── types.ts              # TypeScript interfaces (Player, CreditsData, WinnerPageProps, etc.)
├── VictoryBanner.tsx     # Tilted -3deg yellow victory banner with comic radiating speed dashes
├── PlayerCard.tsx        # Neo-brutalist cards for 1st, 2nd, and 3rd place with rank tab, crown, and avatar
├── Podium.tsx            # Orchestrates the 2nd | 1st | 3rd place podium with sequential entrance
├── Scoreboard.tsx        # Neobrutalist scoreboard panel listing all participants with highlighted winner
├── MessageCard.tsx       # Feedback / message card with speech bubble icon and clean typography
├── CreditsBar.tsx        # Compact pill component recognizing question creators and developers
├── ActionButtons.tsx     # Triple button deck (Play Again [Yellow], Rematch [Blue], Return to Lobby [White])
├── WinnerPage.tsx        # Master container layout with decorative corner polygons and responsive grid
└── index.ts              # Barrel export for seamless imports
```

---

## 🚀 Quick Start & Integration

### Basic Usage

```tsx
import React from 'react';
import { WinnerPage } from './components/WinnerPage';

export default function GameResults() {
  const players = [
    { id: '1', name: 'AMAN', score: 30, rank: 1, avatarUrl: '/avvtar/aman.svg' },
    { id: '2', name: 'AZIZ', score: 22, rank: 2, avatarUrl: '/avvtar/aziz.svg' },
    { id: '3', name: 'AMISH', score: 16, rank: 3, avatarUrl: '/avvtar/amish.svg' },
    { id: '4', name: 'VISH', score: 7, rank: 4, avatarUrl: '/avvtar/vish.svg' },
  ];

  const handleActions = {
    onPlayAgain: () => console.log('Starting new game...'),
    onRematch: () => console.log('Initiating rematch vote...'),
    onReturnLobby: () => console.log('Returning to lobby...'),
  };

  return (
    <WinnerPage
      players={players}
      actions={handleActions}
    />
  );
}
```

---

## 🎨 Design Specifications & Design Tokens

| Property | Specification | Implementation / Tailwind |
|---|---|---|
| **Main Card Width** | `90vw max-width 1200px` (Desktop) / `95vw` (Mobile) | `w-[95vw] max-w-[1200px]` |
| **Card Background** | Warm Cream / Off-White (`#FFF8EF`) | `bg-[#FFF8EF]` |
| **Card Border** | `4px solid #111827` | `border-4 border-[#111827]` |
| **Card Radius** | `24px` | `rounded-[24px]` |
| **Card Shadow** | `8px 8px 0px #111827` | `shadow-[8px_8px_0px_#111827]` |
| **Corner Polygons** | Top-Left: Blue, Bottom-Left: Pink, Bottom-Right: Yellow | Pure CSS border triangles |
| **Victory Banner** | `background: #FFD83D; border: 5px solid #111827; transform: rotate(-3deg);` | Tilted banner + SVG bursts |
| **Buttons** | `height: 65px; border: 4px solid black; box-shadow: 5px 5px 0 black;` | Hover `-3px` translate + active press |

---

## 📱 Responsive Layout Order

- **Desktop (`>= 1024px`)**:
  3-Column CSS Grid:
  `[ 280px MessageCard ]  [ 1fr Podium + CreditsBar ]  [ 280px Scoreboard ]`

- **Mobile (`< 1024px`)**:
  Vertical stacking prioritized for player engagement:
  1. **Winner Podium** (`order-1`)
  2. **Scoreboard Panel** (`order-2`)
  3. **Feedback Message Card** (`order-3`)
  4. **Action Buttons Deck** (`order-4`)
