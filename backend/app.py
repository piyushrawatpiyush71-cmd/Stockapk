import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import json

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

POPULAR_STOCKS = [
    {"symbol": "AAPL", "name": "Apple Inc."},
    {"symbol": "GOOGL", "name": "Alphabet Inc."},
    {"symbol": "MSFT", "name": "Microsoft Corporation"},
    {"symbol": "AMZN", "name": "Amazon.com Inc."},
    {"symbol": "TSLA", "name": "Tesla Inc."},
    {"symbol": "META", "name": "Meta Platforms Inc."},
    {"symbol": "NVDA", "name": "NVIDIA Corporation"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
    {"symbol": "V", "name": "Visa Inc."},
    {"symbol": "JNJ", "name": "Johnson & Johnson"},
    {"symbol": "WMT", "name": "Walmart Inc."},
    {"symbol": "PG", "name": "Procter & Gamble Co."},
    {"symbol": "MA", "name": "Mastercard Inc."},
    {"symbol": "UNH", "name": "UnitedHealth Group Inc."},
    {"symbol": "HD", "name": "The Home Depot Inc."},
    {"symbol": "DIS", "name": "The Walt Disney Company"},
    {"symbol": "PYPL", "name": "PayPal Holdings Inc."},
    {"symbol": "NFLX", "name": "Netflix Inc."},
    {"symbol": "ADBE", "name": "Adobe Inc."},
    {"symbol": "CRM", "name": "Salesforce Inc."}
]

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/search', methods=['GET'])
def search_stocks():
    query = request.args.get('q', '').upper()
    if not query:
        return jsonify(POPULAR_STOCKS[:10])
    
    results = [s for s in POPULAR_STOCKS if query in s['symbol'] or query.lower() in s['name'].lower()]
    
    if not results:
        try:
            ticker = yf.Ticker(query)
            info = ticker.info
            if info.get('shortName'):
                results = [{"symbol": query, "name": info.get('shortName', query)}]
        except:
            pass
    
    return jsonify(results[:10])

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock(symbol):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        
        hist = ticker.history(period="1d")
        current_price = hist['Close'].iloc[-1] if not hist.empty else info.get('currentPrice', 0)
        prev_close = info.get('previousClose', current_price)
        change = current_price - prev_close
        change_percent = (change / prev_close * 100) if prev_close else 0
        
        stock_data = {
            "symbol": symbol.upper(),
            "name": info.get('shortName', symbol),
            "price": round(current_price, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "previousClose": round(prev_close, 2),
            "open": round(info.get('open', 0), 2),
            "dayHigh": round(info.get('dayHigh', 0), 2),
            "dayLow": round(info.get('dayLow', 0), 2),
            "volume": info.get('volume', 0),
            "marketCap": info.get('marketCap', 0),
            "peRatio": round(info.get('trailingPE', 0), 2) if info.get('trailingPE') else None,
            "eps": round(info.get('trailingEps', 0), 2) if info.get('trailingEps') else None,
            "week52High": round(info.get('fiftyTwoWeekHigh', 0), 2),
            "week52Low": round(info.get('fiftyTwoWeekLow', 0), 2),
            "avgVolume": info.get('averageVolume', 0),
            "dividend": round(info.get('dividendYield', 0) * 100, 2) if info.get('dividendYield') else None,
            "beta": round(info.get('beta', 0), 2) if info.get('beta') else None,
            "sector": info.get('sector', 'N/A'),
            "industry": info.get('industry', 'N/A'),
            "description": info.get('longBusinessSummary', 'No description available.')
        }
        
        return jsonify(stock_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/stock/<symbol>/history', methods=['GET'])
def get_stock_history(symbol):
    try:
        period = request.args.get('period', '1mo')
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period=period)
        
        if hist.empty:
            return jsonify({"error": "No historical data available"}), 400
        
        history_data = []
        for date, row in hist.iterrows():
            history_data.append({
                "date": date.strftime('%Y-%m-%d'),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume'])
            })
        
        return jsonify(history_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/stock/<symbol>/prediction', methods=['GET'])
def get_stock_prediction(symbol):
    try:
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        hist = ticker.history(period="3mo")
        
        if hist.empty:
            return jsonify({"error": "No historical data available"}), 400
        
        current_price = hist['Close'].iloc[-1]
        avg_price = hist['Close'].mean()
        price_std = hist['Close'].std()
        trend = "upward" if hist['Close'].iloc[-1] > hist['Close'].iloc[0] else "downward"
        volatility = (price_std / avg_price) * 100
        
        recent_changes = hist['Close'].pct_change().tail(5).mean() * 100
        
        if gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_api_key)
                model = genai.GenerativeModel('gemini-pro')
                
                prompt = f"""Analyze this stock data and provide a brief investment insight:
                Stock: {symbol.upper()} - {info.get('shortName', symbol)}
                Current Price: ${current_price:.2f}
                3-Month Trend: {trend}
                Volatility: {volatility:.2f}%
                Recent 5-day avg change: {recent_changes:.2f}%
                Sector: {info.get('sector', 'N/A')}
                P/E Ratio: {info.get('trailingPE', 'N/A')}
                
                Provide a concise analysis (2-3 sentences) about potential price movement and key factors to watch. Be balanced and mention both risks and opportunities."""
                
                response = model.generate_content(prompt)
                ai_analysis = response.text
            except Exception as e:
                ai_analysis = f"AI analysis unavailable. Based on technical indicators, the stock shows a {trend} trend with {volatility:.1f}% volatility."
        else:
            ai_analysis = f"Based on technical analysis, {symbol.upper()} shows a {trend} trend over the past 3 months with {volatility:.1f}% volatility. Recent momentum indicates {'positive' if recent_changes > 0 else 'negative'} short-term movement."
        
        if trend == "upward" and recent_changes > 0:
            sentiment = "Bullish"
            confidence = min(75 + (recent_changes * 2), 90)
        elif trend == "downward" and recent_changes < 0:
            sentiment = "Bearish"
            confidence = min(75 + (abs(recent_changes) * 2), 90)
        else:
            sentiment = "Neutral"
            confidence = 50 + (abs(recent_changes) * 2)
        
        prediction_data = {
            "symbol": symbol.upper(),
            "currentPrice": round(current_price, 2),
            "trend": trend,
            "volatility": round(volatility, 2),
            "sentiment": sentiment,
            "confidence": round(min(confidence, 95), 1),
            "analysis": ai_analysis,
            "technicalIndicators": {
                "movingAverage50": round(hist['Close'].tail(50).mean(), 2) if len(hist) >= 50 else round(avg_price, 2),
                "movingAverage20": round(hist['Close'].tail(20).mean(), 2) if len(hist) >= 20 else round(avg_price, 2),
                "rsi": calculate_rsi(hist['Close']),
                "support": round(hist['Low'].tail(20).min(), 2),
                "resistance": round(hist['High'].tail(20).max(), 2)
            },
            "priceTargets": {
                "conservative": round(current_price * (1 + (recent_changes / 100) * 0.5), 2),
                "moderate": round(current_price * (1 + (recent_changes / 100)), 2),
                "aggressive": round(current_price * (1 + (recent_changes / 100) * 1.5), 2)
            }
        }
        
        return jsonify(prediction_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def calculate_rsi(prices, period=14):
    try:
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi.iloc[-1], 2) if not pd.isna(rsi.iloc[-1]) else 50
    except:
        return 50

@app.route('/api/trending', methods=['GET'])
def get_trending():
    trending = []
    for stock in POPULAR_STOCKS[:6]:
        try:
            ticker = yf.Ticker(stock['symbol'])
            hist = ticker.history(period="1d")
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                info = ticker.info
                prev_close = info.get('previousClose', current_price)
                change_percent = ((current_price - prev_close) / prev_close * 100) if prev_close else 0
                
                trending.append({
                    "symbol": stock['symbol'],
                    "name": stock['name'],
                    "price": round(current_price, 2),
                    "changePercent": round(change_percent, 2)
                })
        except:
            continue
    
    return jsonify(trending)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
