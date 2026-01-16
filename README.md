# OpenAI Log Visualizer

A modern, high-performance visualizer for OpenAI Realtime API events. This tool allows users to parse, view, and analyze real-time session logs with an elegant interface.

## Features

- **Session Management**: Automatically detects and groups events by session IDs.
- **Event Visualization**: Structured views for `response.created`, `response.audio.delta`, function calls, and more.
- **Grouped & Flat Views**: Toggle between a chronological list or grouped lifecycle view of events.
- **Audio Playback**: Listen to `response.audio.delta` events directly from the UI.
- **Modern UI**: Built with Shadcn UI, featuring a responsive and dark-mode-ready design.

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: Shadcn UI / Radix UI
- **Package Manager**: Yarn

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js (v18+)
- Yarn

### Installation

Clone the repository and install dependencies:

```bash
yarn install
```

### Running Locally

Start the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Launch the Application**: Open the web interface.
2. **Input Logs**: Paste your OpenAI Realtime API logs directly into the visualizer or upload a log file if prompted.
3. **Analyze**: Use the collapsible sections and filters to inspect event details, arguments, and audio responses.
