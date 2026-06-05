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

- **Flat line list**: Home screen shows all saved lines (Chessable-style). Tap a line to open board.
- **Add line**: + button creates a new line (opens board in record mode). Name + playing color on save.
- **Rename/delete**: Long-press a line → rename or delete from context menu.
- **Variation from here**: [Variation] button on board creates a new line from current board position.
- **Move pills**: Horizontal scrollable row of move pills below the board. Tap any pill to navigate to that move.
- **Auto-save**: Moves played on existing lines are saved immediately; new lines need an explicit Save.
- **Smooth piece animation**: Chess pieces slide smoothly from square to square (Animated API, 155ms cubic-ease)
- Interactive chess board with Neo-style pieces (vibrant 2D pieces mimicking chess.com) — **pieces always visible** (cache key bug fixed)
- Board color themes: Classic, Green, Blue Ocean, Purple, Red, Midnight, Coral + Custom color picker
- Move recording via click/tap on board with legal move highlights
- Move navigation: prev, next, start, end, flip board
- Dark/Light mode support

## Key Files

- `artifacts/chess-repertoire/types/chess.ts` — All chess type definitions
- `artifacts/chess-repertoire/utils/chess.ts` — Chess logic (FEN parsing, move generation)
- `artifacts/chess-repertoire/context/RepertoireContext.tsx` — Line[] storage (AsyncStorage, CRUD)
- `artifacts/chess-repertoire/context/BoardContext.tsx` — Board state (moves[], currentMoveIndex, linear nav)
- `artifacts/chess-repertoire/components/ChessBoard.tsx` — Interactive board
- `artifacts/chess-repertoire/components/ChessPiece.tsx` — Piece rendering (SVG cache + fallback)
- `artifacts/chess-repertoire/utils/PieceCache.ts` — Pre-fetches piece SVGs at app start
- `artifacts/chess-repertoire/app/(tabs)/index.tsx` — Home: flat line list screen
- `artifacts/chess-repertoire/app/board/[id].tsx` — Board screen with move pills + Variation button

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
