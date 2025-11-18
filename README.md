# Reading Comprehension App

An interactive reading comprehension application with AI-powered feedback and cursor tracking analytics. This app helps students improve their reading comprehension skills by providing personalized feedback based on their reading behavior patterns.

The original design is available at [Figma](https://www.figma.com/design/KIRnobZJKIG7X1QQS8LVAV/Reading-Comprehension-App).

## Features

- **Interactive Reading Comprehension Quiz**: Read passages and answer multiple-choice questions
- **Cursor Tracking**: Real-time tracking of cursor movements during reading sessions
- **Visual Heatmap**: Visual representation of reading patterns showing where attention was focused
- **AI-Powered Feedback**: Personalized feedback using Google's Gemini AI based on:
  - Reading behavior analysis (cursor tracking data)
  - Visual attention patterns (heatmap)
  - Question performance
- **Screenshot Capture**: Capture reading sessions with integrated heatmap visualization
- **Analytics Dashboard**: Sidebar panel showing cursor tracking data, heatmap controls, and reading insights

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Build tool and development server
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **Google Gemini AI** - AI-powered feedback generation
- **html-to-image** - Screenshot capture functionality

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd dm2730-reading-comprehension
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

**Note:** The `.env` file is already in `.gitignore` and will not be committed to the repository.

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## Usage

1. **Start a Quiz Session**: Click "Start The Quiz" to begin tracking your cursor movements
2. **Read the Passage**: Read through the provided passage carefully
3. **Answer Questions**: Select your answers for each multiple-choice question
4. **View Feedback**: After answering, receive AI-powered personalized feedback based on your reading behavior
5. **Analyze Your Reading**: 
   - Toggle the sidebar to view cursor tracking data
   - View the heatmap overlay showing where you spent the most time reading
   - Capture screenshots of your reading session with the heatmap
6. **Review Insights**: Get actionable tips based on your reading patterns

## Project Structure

```
src/
├── components/
│   ├── ReadingComprehension.tsx    # Main quiz component
│   ├── CursorTracker.tsx          # Cursor movement tracking
│   ├── CursorHeatmap.tsx          # Visual heatmap generation
│   ├── CursorTrackingData.tsx     # Analytics dashboard sidebar
│   ├── RealtimeCursorIndicator.tsx # Real-time cursor visualization
│   └── ui/                        # Reusable UI components (Radix UI)
├── services/
│   └── geminiService.ts           # Gemini AI integration
├── App.tsx                        # Main application component
└── main.tsx                       # Application entry point
```

## Key Components

### ReadingComprehension
The core quiz component that displays passages and questions, handles answer submission, and integrates with the AI feedback system.

### CursorTracker
Tracks cursor movements in real-time, recording position (x, y) and timestamps for analysis.

### CursorHeatmap
Generates a visual heatmap overlay showing reading attention patterns based on cursor tracking data.

### Gemini Service
Provides two main functions:
- `analyzeReadingBehavior()`: Analyzes overall reading patterns and provides actionable tips
- `getPersonalizedQuestionFeedback()`: Provides question-specific feedback based on reading behavior

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

## Development Notes

- The app uses cursor tracking data to analyze reading behavior
- Heatmaps are generated using canvas-based rendering
- Screenshots are optimized using JPEG compression for smaller file sizes
- Cursor data is sampled (100 points max) when sending to Gemini API to optimize token usage
- The app gracefully handles missing API keys with fallback feedback

## License

This project is part of the DM2730 course at KTH Royal Institute of Technology.
