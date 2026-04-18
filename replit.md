# Chess Repertoire App

## Overview

A mobile chess opening repertoire app built with Expo/React Native. Record, review and analyse chess openings with full move tree support.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (api-server artifact)
- **Database**: PostgreSQL + Drizzle ORM (available but not used in chess app)
- **Mobile**: Expo SDK 54, React Native 0.81
- **State**: React Context + AsyncStorage (no backend needed)
- **Routing**: Expo Router (file-based)

## Artifacts

- **chess-repertoire** (`/`) — Main mobile app for chess opening repertoire
- **api-server** (`/api`) — Shared Express backend (not currently used by chess app)
- **mockup-sandbox** (`/__mockup`) — Design tool

## Chess App Features

- Opening repertoire list with search, add, delete
- Interactive chess board with Neo-style pieces (vibrant 2D pieces mimicking chess.com)
- Board color themes: Classic, Green, Blue Ocean, Purple, Red, Midnight, Coral + Custom color picker
- Move recording via click/tap on board
- PGN import
- Move tree display (variation branching like ChessBase)
- Move navigation: prev, next, start, end, flip board
- Move annotations: !! ★ ✓ !? ? ?? (brilliant, great, good, best, inaccuracy, mistake, blunder)
- Engine analysis panel (Stockfish-style evaluation with material-based eval)
- Real-time eval bar
- Dark/Light mode support

## Key Files

- `artifacts/chess-repertoire/types/chess.ts` — All chess type definitions
- `artifacts/chess-repertoire/utils/chess.ts` — Chess logic (FEN parsing, move generation)
- `artifacts/chess-repertoire/context/RepertoireContext.tsx` — Opening storage state
- `artifacts/chess-repertoire/context/BoardContext.tsx` — Board game state
- `artifacts/chess-repertoire/components/ChessBoard.tsx` — Interactive board
- `artifacts/chess-repertoire/components/ChessPiece.tsx` — Piece rendering
- `artifacts/chess-repertoire/components/MoveTree.tsx` — Move tree display
- `artifacts/chess-repertoire/app/(tabs)/index.tsx` — Repertoire list screen
- `artifacts/chess-repertoire/app/board/[id].tsx` — Board/analysis screen

## Expo Go Compatibility

The chess app is fully compatible with **Expo Go** (no custom native modules required). Packages that require a development build have been removed:
- ~~`react-native-keyboard-controller`~~ → replaced with React Native core `KeyboardAvoidingView`
- ~~`expo-glass-effect`~~ → removed (iOS liquid glass, not in Expo Go)
- ~~`expo-symbols`~~ → removed (iOS SF Symbols, not in Expo Go)
- ~~`@tanstack/react-query`~~ → removed (not needed, chess app is fully local)
- ~~`@workspace/api-client-react`~~ → removed (workspace-only, chess app needs no backend)

### Scanning in Expo Go
The Metro bundler serves:  
`exp://f3921da9-181e-4d58-aa9d-2342a4d1a5b1-00-hon9bxdo47js.expo.worf.replit.dev`

### Running locally (tunnel mode)
```bash
cd artifacts/chess-repertoire
npx expo start --tunnel
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/chess-repertoire run dev` — run Expo app (Replit workflow)
- `pnpm --filter @workspace/chess-repertoire run start` — run with tunnel (for Expo Go outside Replit)
