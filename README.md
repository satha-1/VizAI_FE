# VizAI – Giant Anteater Monitoring

A production-quality React + TypeScript + Tailwind CSS frontend for the VizAI Phase 1 web application. This dashboard enables zoo researchers to monitor and analyze giant anteater behavior using advanced computer vision and AI.

## Features

- **Dashboard**: Overview of behavior patterns with interactive charts
  - Behavior count bar chart
  - Duration distribution (stacked bar / pie chart toggle)
  - 24-hour activity heatmap

- **Timeline**: Chronological behavior event explorer
  - Advanced filtering (behavior type, duration, time of day, camera)
  - Video player modal with metadata
  - Playback speed controls

- **Reports**: Comprehensive report builder
  - Daily Behavior Summary
  - Weekly/Monthly Trend Report
  - Behavior-Specific Analysis
  - Welfare Assessment Report
  - Export to PDF, Excel, PowerPoint

- **Chat**: AI-powered behavior analysis assistant (stub for future integration)

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Routing**: React Router v6
- **State/Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS with custom theme
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/                 # API layer and mock data
│   ├── api.ts          # API functions
│   ├── hooks.ts        # React Query hooks
│   └── mockData.ts     # Mock data generators
├── components/
│   ├── atoms/          # Basic UI components
│   ├── molecules/      # Composed components
│   └── organisms/      # Complex components
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   └── DateRangeContext.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── AnimalSelection.tsx
│   ├── Dashboard.tsx
│   ├── Timeline.tsx
│   ├── Reports.tsx
│   └── Chat.tsx
├── styles/             # Global styles
├── types/              # TypeScript types
├── App.tsx             # Root component
└── main.tsx           # Entry point
```

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Teal (Primary) | `#008C8C` | Buttons, active states, chart accents |
| Lime Green (Accent) | `#A3E635` | Highlights, status badges, positive indicators |
| Charcoal | `#1F2937` | Text, headings, dark surfaces |
| Off White | `#F9FAFB` | Page background, card surfaces |

## Keyboard Shortcuts

- `Ctrl+1` → Dashboard
- `Ctrl+2` → Timeline
- `Ctrl+3` → Reports
- `Ctrl+4` → Chat

## Demo Credentials

Use any email/password combination to log in. The authentication is mocked for demo purposes.

## License

© 2025 VizAI – MetroParks Zoo. All rights reserved.

