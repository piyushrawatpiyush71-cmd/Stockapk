# STKPP - Stock Price Predictor

## Overview
A full-stack stock prediction web application with HTML/CSS frontend and Python Flask backend. Features live stock prices via yfinance, AI-powered predictions using Gemini API, and a professional GitHub-inspired UI.

## Project Structure
```
├── frontend/           # Static frontend files
│   ├── index.html      # Main HTML page
│   ├── css/
│   │   └── styles.css  # All styling with responsive design
│   └── js/
│       └── app.js      # Frontend JavaScript logic
├── backend/
│   ├── app.py          # Flask API server
│   └── requirements.txt # Python dependencies
├── vercel.json         # Vercel deployment configuration
└── replit.md           # This documentation
```

## Features
- Stock search with autocomplete
- Live stock prices using yfinance
- AI-powered stock analysis (Gemini API)
- Interactive price charts with Chart.js
- Technical indicators (RSI, Moving Averages, Support/Resistance)
- Price targets and sentiment analysis
- Fully responsive design for all devices
- Trending stocks dashboard

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Python 3.11, Flask, yfinance, pandas
- **AI**: Google Gemini API for stock analysis
- **Deployment**: Vercel-ready configuration

## API Endpoints
- `GET /api/search?q={query}` - Search stocks
- `GET /api/stock/{symbol}` - Get stock details
- `GET /api/stock/{symbol}/history?period={period}` - Historical data
- `GET /api/stock/{symbol}/prediction` - AI prediction
- `GET /api/trending` - Trending stocks

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key for AI predictions

## Design System
- Primary: #59636E
- Accent: #0969DA
- Background: #FFFFFF
- Text: #1F2328
- Font: Segoe UI / System fonts

## Running Locally
The Flask server runs on port 5000 and serves both the API and static frontend files.
