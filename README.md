# Reading Comprehension App

An interactive reading comprehension quiz application with AI-powered feedback and cursor tracking analytics. This app helps students improve their reading comprehension skills by analyzing their reading behavior patterns and providing personalized, actionable feedback.

The original design is available at [Figma](https://www.figma.com/design/KIRnobZJKIG7X1QQS8LVAV/Reading-Comprehension-App).

## Features

### Core Functionality
- **Multi-Passage Quiz**: Complete 10 reading comprehension passages with multiple-choice questions
- **Real-time Cursor Tracking**: Tracks cursor movements during reading to analyze attention patterns
- **Heatmap Visualization**: Generates visual heatmaps showing where readers focused their attention (visible in debug mode and screenshots)
- **AI-Powered Personalized Feedback**: Uses Google's Gemini 2.0 Flash model to provide:
  - Question-specific feedback based on reading behavior
  - Actionable tips for improving comprehension
  - Analysis of which sections were read vs. skipped
- **Progress Tracking**: Track performance across all passages with statistics on time spent, accuracy, and attempts

### User Experience
- **Session Management**: Start, stop, and restart quiz sessions with data persistence per passage
- **Navigation**: Move between passages while preserving individual progress
- **Analytics Dashboard**: Collapsible sidebar showing cursor data, heatmap controls, and reading insights
- **Summary Screen**: Comprehensive performance summary with:
  - User demographic profile
  - Total time spent
  - Accuracy rate (perfect passages)
  - Average time per passage
  - Visual heatmap gallery for all completed passages
- **Screenshot Capture**: Automatically captures reading sessions with integrated heatmap overlay

### Research & Data Collection
- **Demographic Data Collection**: Collects participant background information for research analysis:
  - Age (18-99)
  - University attendance status (yes/no/currently attending)
  - English fluency level (first language, learned at young age, high school, university, not at all)
  - First language (if English is not first language)
  - SWESAT (Högskoleprovet) experience
- **Data Storage**: All demographic data stored securely alongside reading behavior data
- **Research Context**: Part of DM2730 Technology Enhanced Learning course at KTH
- **Privacy**: Comprehensive data collection notice and informed consent on landing page

## Tech Stack

- **React 18** with TypeScript
- **Vite 6** - Build tool and development server
- **Tailwind CSS** - Styling with modern CSS features
- **Radix UI** - Accessible component primitives
- **Google Gemini AI (2.0 Flash)** - AI-powered feedback generation
- **html-to-image** - Screenshot capture functionality
- **Lucide React** - Icon library

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd read-the-text
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

Get your Gemini API key from: https://aistudio.google.com/app/apikey

**Note:** The `.env` file is already in `.gitignore` and will not be committed to the repository.

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000` (configured in `vite.config.ts`).

## Usage

### Starting a Quiz Session

1. **Start Tracking**: Click "Start The Quiz" to begin cursor tracking
2. **Read the Passage**: Read through the provided passage carefully while your cursor movements are tracked
3. **Answer Questions**: Select your answer for the multiple-choice question
4. **Receive Feedback**: Get AI-powered personalized feedback based on:
   - Your reading behavior patterns
   - Which sections you read vs. skipped
   - Question correctness and your selected answer
5. **Navigate Passages**: Use the arrow buttons to move between passages
6. **View Analytics**: Toggle the sidebar to view:
   - Cursor tracking statistics
   - Debug heatmap overlay (optional)
   - Screenshot capture options

### Completing the Quiz

- Each passage must be answered correctly to proceed
- Wrong attempts are tracked per passage
- Time spent on each passage is recorded
- Screenshots with heatmaps are automatically captured upon correct answers
- After completing all 10 passages, view your comprehensive summary:
  - Total time spent
  - Accuracy rate (percentage of first-try correct answers)
  - Average time per passage
  - Visual heatmap gallery for all passages

### Understanding the Heatmap

- **Green/Bright areas**: High cursor activity (more time spent)
- **Dark areas**: Low or no cursor activity (less time spent or skipped)
- Heatmaps are hidden by default but captured in screenshots
- Enable "Debug Mode" in the sidebar to see the heatmap overlay in real-time

## Project Structure

```
src/
├── components/
│   ├── ReadingComprehension.tsx       # Main quiz component with question handling
│   ├── CursorTracker.tsx              # Real-time cursor movement tracking
│   ├── CursorHeatmap.tsx              # Canvas-based heatmap visualization
│   ├── CursorTrackingData.tsx         # Analytics sidebar panel
│   ├── RealtimeCursorIndicator.tsx    # Live cursor position indicator (optional)
│   ├── figma/
│   │   └── ImageWithFallback.tsx      # Image loading with fallback handling
│   └── ui/                            # Reusable UI components (Radix UI + Tailwind)
│       ├── button.tsx
│       ├── card.tsx
│       ├── alert.tsx
│       └── ... (40+ UI components)
├── data/
│   └── passages.json                  # 10 reading comprehension passages with questions
├── services/
│   ├── geminiService.ts               # Gemini AI integration for feedback
│   └── passageService.ts              # Passage data loading and management
├── types/
│   └── passage.ts                     # TypeScript interfaces for passages
├── styles/
│   └── globals.css                    # Global styles and Tailwind configuration
├── App.tsx                            # Main application component with state management
├── main.tsx                           # Application entry point
└── index.css                          # Base CSS imports
```

## Key Components

### App.tsx
The main application component that orchestrates:
- **Multi-passage state management**: Tracks data for all 10 passages independently
- **Navigation**: Handles moving between passages
- **Timer tracking**: Records time spent per passage
- **Screenshot capture**: Composites heatmap onto passage screenshots
- **Summary generation**: Calculates statistics and displays results

### ReadingComprehension.tsx
Core quiz component featuring:
- Passage display with scrollable content
- Multiple-choice question handling
- Answer validation and wrong attempt tracking
- Integration with Gemini AI for personalized feedback
- Forwarded ref to expose passage element for heatmap

### CursorTracker.tsx
Tracks cursor movements and collects data:
- Records x, y coordinates and timestamps
- Throttles data collection for performance
- Can be enabled/disabled dynamically

### CursorHeatmap.tsx
Generates visual heatmap overlay:
- Canvas-based rendering with gradient effects
- Relative to passage container coordinates
- Configurable opacity and radius
- Exportable as image
- Hidden by default (visible in debug mode and screenshots)

### CursorTrackingData.tsx
Analytics sidebar displaying:
- Cursor data statistics (points, duration, coverage)
- Screenshot preview
- Heatmap controls (save, capture, debug toggle)
- Reading behavior insights

### Gemini Service
Provides two AI-powered analysis functions:

#### `analyzeReadingBehavior()`
Analyzes overall reading patterns:
- Processes cursor tracking data (sampled to 100 points for efficiency)
- Analyzes heatmap visual patterns
- Provides 4-6 actionable, concise feedback tips
- Optimized for token usage with JPEG compression and data sampling

#### `getPersonalizedQuestionFeedback()`
Provides question-specific feedback:
- Analyzes which sections were actually read
- Connects reading behavior to answer correctness
- For correct answers: Validates they read the relevant sections
- For incorrect answers: Guides to the correct section without revealing the answer
- Maximum 2-3 sentences (30-40 words)
- Emphasizes evidence-based claims

## Optimization Features

The app includes several optimizations for performance and cost efficiency:

### Screenshot Optimization
- **Pixel Ratio Limiting**: Caps at 1.5x instead of full device pixel ratio (2-3x on retina)
- **JPEG Compression**: Uses JPEG (quality 0.85) instead of PNG
- **File Size**: Reduced from ~500KB-2MB (PNG) to ~50-150KB (JPEG) - 10-20x smaller
- **Heatmap Compositing**: Efficiently overlays heatmap during capture without DOM manipulation

### AI Token Optimization
- **Data Sampling**: Sends 100 evenly distributed cursor points instead of all points (can be 1000+)
- **Maintains Quality**: Sampling preserves temporal and spatial distribution
- **Token Reduction**: 10-20x fewer tokens while maintaining analytical accuracy
- **Visual Priority**: Heatmap image is the primary analysis source, JSON is supplementary

### Performance Features
- **Canvas-based Heatmap**: Efficient rendering using HTML5 Canvas API
- **Throttled Tracking**: Cursor data collection is throttled for optimal performance
- **Conditional Rendering**: Heatmap only renders when tracking is enabled
- **Memory Management**: Per-passage data storage prevents memory leaks

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

## Deployment

### Prerequisites
- Cloudflare account ([Sign up for free](https://dash.cloudflare.com/sign-up))
- Git repository (GitHub, GitLab, or Bitbucket)
- Gemini API key

### Deploy to Cloudflare Pages

#### Option 1: Automatic Deployment via Git Integration (Recommended)

1. **Push your code to a Git repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
   - Authorize and select your repository

3. **Configure build settings**
   - **Project name**: `read-the-text` (or your preferred name)
   - **Production branch**: `main`
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`

4. **Add environment variables**
   - In project settings, go to **Settings** → **Environment variables**
   - Add variable:
     - **Variable name**: `VITE_GEMINI_API_KEY`
     - **Value**: Your Gemini API key
   - Add to both **Production** and **Preview** environments

5. **Deploy**
   - Click **Save and Deploy**
   - Your site will be available at `https://<your-project-name>.pages.dev`
   - Subsequent pushes to your branch will trigger automatic deployments

#### Option 2: Direct Upload (Faster for one-time deployment)

1. **Build the project locally**
   ```bash
   npm run build
   ```

2. **Deploy via Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages** → **Create application** → **Pages** → **Upload assets**
   - Name your project (e.g., `read-the-text`)
   - Upload the `dist` folder
   - Add environment variable `VITE_GEMINI_API_KEY` in project settings

#### Option 3: Wrangler CLI (For developers)

1. **Install Wrangler** (if not already installed)
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Build and deploy**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=read-the-text
   ```

### Post-Deployment

- **Custom Domain**: Add a custom domain in **Settings** → **Custom domains**
- **Environment Variables**: Manage in **Settings** → **Environment variables**
- **Build Settings**: Adjust in **Settings** → **Builds & deployments**
- **Analytics**: View deployment and visitor analytics in the dashboard

### Important Notes

- Environment variables must be prefixed with `VITE_` to be exposed to the client
- The app is a static site (no server-side rendering)
- All AI processing happens client-side using the Gemini API
- Ensure your Gemini API key has appropriate quota limits for production use

## Development Notes

### Data Structure
- **10 Reading Passages**: Stored in `src/data/passages.json`
- Each passage includes:
  - Title and full text
  - One multiple-choice question with 4 options
  - Correct answer index

### Database Schema (Cloudflare D1)
The application uses Cloudflare D1 (SQLite) for data storage with the following structure:

#### Sessions Table
Stores user session and demographic data:
- `id` (TEXT, PRIMARY KEY): Unique session identifier
- `email` (TEXT): User email address
- `status` (TEXT): Session status ('in_progress' or 'completed')
- `current_passage_index` (INTEGER): Current position in quiz
- `passage_order` (TEXT): Randomized passage order (JSON array)
- `total_passages` (INTEGER): Total number of passages (10)
- `created_at` (TEXT): Session start timestamp
- `completed_at` (TEXT): Session completion timestamp
- `total_time_ms` (INTEGER): Total time spent in milliseconds
- **Demographic Fields:**
  - `age` (INTEGER): Participant age (18-99)
  - `has_attended_university` (TEXT): 'yes', 'no', or 'currently_attending'
  - `english_fluency` (TEXT): 'not_at_all', 'young_age', 'high_school', 'university', or 'first_language'
  - `first_language` (TEXT): Native language if not English
  - `completed_swesat` (TEXT): 'yes', 'no', or 'unsure'

#### Passage Results Table
Stores per-passage completion data:
- `session_id` (TEXT): Foreign key to sessions
- `passage_index` (INTEGER): Passage position (0-9)
- `passage_id` (INTEGER): Actual passage from pool
- `screenshot_r2_key` (TEXT): R2 storage key for heatmap screenshot
- `cursor_history_r2_key` (TEXT): R2 storage key for cursor data
- `is_complete` (INTEGER): Completion status (0/1)
- `wrong_attempts` (INTEGER): Number of incorrect answers
- `time_spent_ms` (INTEGER): Time spent on passage
- `final_selected_answer` (TEXT): Final answer chosen

#### Passage Attempts Table
Stores each answer attempt with AI feedback:
- `session_id` (TEXT): Foreign key to sessions
- `passage_index` (INTEGER): Passage position
- `attempt_number` (INTEGER): Sequential attempt counter
- `selected_answer` (TEXT): Answer chosen
- `is_correct` (INTEGER): Correctness (0/1)
- `gemini_response` (TEXT): AI-generated feedback
- `screenshot_r2_key` (TEXT): Heatmap screenshot for this attempt
- `created_at` (TEXT): Attempt timestamp

#### Storage (Cloudflare R2)
Binary data stored in R2 object storage:
- **Screenshots**: JPEG images with heatmap overlays (~50-150KB each)
- **Cursor History**: JSON files with cursor coordinate arrays

### Database Migrations
The project includes SQL migrations in the `/migrations` directory:
- **0001_initial.sql**: Creates base tables (sessions, passage_results, passage_attempts)
- **0002_add_attempt_screenshots.sql**: Adds screenshot capability to attempts
- **0003_rename_nickname_to_email.sql**: Changes nickname field to email
- **0004_add_user_demographics.sql**: Adds demographic data fields

To apply migrations locally:
```bash
npx wrangler d1 execute read_the_text_db --local --file=migrations/0001_initial.sql
npx wrangler d1 execute read_the_text_db --local --file=migrations/0002_add_attempt_screenshots.sql
npx wrangler d1 execute read_the_text_db --local --file=migrations/0003_rename_nickname_to_email.sql
npx wrangler d1 execute read_the_text_db --local --file=migrations/0004_add_user_demographics.sql
```

To apply migrations to production:
```bash
npx wrangler d1 execute read_the_text_db --remote --file=migrations/0004_add_user_demographics.sql
```

**Note**: Apply migrations in order. Existing migrations have already been applied to production.

### State Management
- **Per-passage tracking**: Each passage maintains independent state for:
  - Cursor history
  - Screenshot with heatmap
  - Completion status
  - Wrong attempts
  - Time spent
- **Session persistence**: Data persists when navigating between passages
- **Timer management**: Automatically tracks time spent per passage

### Heatmap Implementation
- Hidden by default (visible only in debug mode and screenshots)
- Canvas-based rendering using radial gradients
- Coordinates are relative to passage container
- Automatically composited onto screenshots
- Configurable opacity (default: 0.6) and radius (default: 40px)

### AI Integration
- Uses Gemini 2.0 Flash model
- Handles rate limiting with graceful fallbacks
- Processes both visual (heatmap) and JSON (cursor coordinates) data
- Prioritizes heatmap for spatial analysis
- Enforces concise output (2-3 sentences for feedback, 4-6 tips for analysis)

### Performance Considerations
- Cursor tracking throttling prevents performance degradation
- Screenshot generation is optimized with JPEG compression
- AI requests are optimized with data sampling
- Canvas rendering is more efficient than DOM-based heatmaps

### Error Handling
- Graceful degradation when Gemini API key is missing
- Fallback messages for rate limiting scenarios
- Console warnings for configuration issues
- Screenshot capture errors are caught and logged

## Passages Included

The app includes 10 diverse reading comprehension passages:

1. **The Great Lakes** - Ecological challenges and invasive species
2. **American Folk Music** - Cultural heritage and musical traditions
3. **New Scotland Yard** - Environmental impact of public buildings
4. **Animal Life** - Evolution and environmental factors
5. **Saying it with Flowers** - Archaeological discoveries in Scotland
6. **Tryggve Lie** - UN leadership and international politics
7. **Men and Women** - Demographics and social implications
8. **The Mayas** - Archaeological discoveries and civilization analysis
9. **Rock Posters** - Visual culture and design movements
10. **Therapy** - Medical research and treatment approaches

Each passage tests different comprehension skills including:
- Inference and implication
- Main idea identification
- Detail comprehension
- Author's purpose and tone

## Contributing

This project is part of the DD2730 course at KTH Royal Institute of Technology. For course-related questions or issues, please contact the course instructors.

## License

This project is part of DM2730 (Technology Enhanced Learning)[https://www.kth.se/student/kurser/kurs/DM2730?l=en] at KTH Royal Institute of Technology.
