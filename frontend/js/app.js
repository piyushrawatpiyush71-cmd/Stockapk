const API_BASE = '';
let currentSymbol = '';
let stockChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    initNavigation();
    initTabs();
    loadTrendingStocks();
});

function initSearch() {
    const searchInput = document.getElementById('stock-search');
    const searchResults = document.getElementById('search-results');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            searchResults.classList.remove('active');
            return;
        }

        debounceTimer = setTimeout(() => {
            searchStocks(query);
        }, 300);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            searchResults.classList.add('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            searchResults.classList.remove('active');
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            loadStock(searchInput.value.trim().toUpperCase());
            searchResults.classList.remove('active');
        }
    });
}

async function searchStocks(query) {
    const searchResults = document.getElementById('search-results');
    
    try {
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item"><span class="name">No results found</span></div>';
        } else {
            searchResults.innerHTML = results.map(stock => `
                <div class="search-result-item" data-symbol="${stock.symbol}">
                    <span class="symbol">${stock.symbol}</span>
                    <span class="name">${stock.name}</span>
                </div>
            `).join('');

            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    if (symbol) {
                        document.getElementById('stock-search').value = symbol;
                        searchResults.classList.remove('active');
                        loadStock(symbol);
                    }
                });
            });
        }
        
        searchResults.classList.add('active');
    } catch (error) {
        console.error('Search error:', error);
    }
}

function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${page}-section`).classList.add('active');
            
            if (page === 'trending') {
                loadTrendingStocks();
            }
        });
    });
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            if (tab === 'chart' && currentSymbol) {
                loadChart(currentSymbol, '1mo');
            } else if (tab === 'prediction' && currentSymbol) {
                loadPrediction(currentSymbol);
            }
        });
    });

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (currentSymbol) {
                loadChart(currentSymbol, btn.dataset.period);
            }
        });
    });
}

async function loadStock(symbol) {
    currentSymbol = symbol;
    
    try {
        const response = await fetch(`${API_BASE}/api/stock/${symbol}`);
        if (!response.ok) throw new Error('Stock not found');
        
        const data = await response.json();
        
        document.getElementById('stock-name').textContent = data.name;
        document.getElementById('stock-symbol').textContent = data.symbol;
        document.getElementById('stock-price').textContent = `$${data.price.toLocaleString()}`;
        
        const changeEl = document.getElementById('stock-change');
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%)`;
        changeEl.textContent = changeText;
        changeEl.className = `stock-change ${data.change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('stat-open').textContent = `$${data.open}`;
        document.getElementById('stat-prev-close').textContent = `$${data.previousClose}`;
        document.getElementById('stat-high').textContent = `$${data.dayHigh}`;
        document.getElementById('stat-low').textContent = `$${data.dayLow}`;
        document.getElementById('stat-volume').textContent = formatNumber(data.volume);
        document.getElementById('stat-market-cap').textContent = formatMarketCap(data.marketCap);
        document.getElementById('stat-pe').textContent = data.peRatio || 'N/A';
        document.getElementById('stat-eps').textContent = data.eps ? `$${data.eps}` : 'N/A';
        document.getElementById('stat-52high').textContent = `$${data.week52High}`;
        document.getElementById('stat-52low').textContent = `$${data.week52Low}`;
        document.getElementById('stat-beta').textContent = data.beta || 'N/A';
        document.getElementById('stat-dividend').textContent = data.dividend ? `${data.dividend}%` : 'N/A';
        
        document.getElementById('stock-description').textContent = data.description;
        document.getElementById('stock-sector').textContent = data.sector;
        document.getElementById('stock-industry').textContent = data.industry;
        
        document.getElementById('stock-details').classList.remove('hidden');
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="overview"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('overview-tab').classList.add('active');
        
    } catch (error) {
        console.error('Error loading stock:', error);
        alert('Error loading stock data. Please try again.');
    }
}

async function loadChart(symbol, period) {
    try {
        const response = await fetch(`${API_BASE}/api/stock/${symbol}/history?period=${period}`);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        const ctx = document.getElementById('stock-chart').getContext('2d');
        
        if (stockChart) {
            stockChart.destroy();
        }
        
        const labels = data.map(d => d.date);
        const prices = data.map(d => d.close);
        const isPositive = prices[prices.length - 1] >= prices[0];
        
        stockChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Price',
                    data: prices,
                    borderColor: isPositive ? '#1A7F37' : '#CF222E',
                    backgroundColor: isPositive ? 'rgba(26, 127, 55, 0.1)' : 'rgba(207, 34, 46, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1F2328',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `$${context.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            color: '#59636E'
                        }
                    },
                    y: {
                        grid: {
                            color: '#D0D7DE'
                        },
                        ticks: {
                            color: '#59636E',
                            callback: (value) => '$' + value.toFixed(2)
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

async function loadPrediction(symbol) {
    const loadingEl = document.getElementById('prediction-loading');
    const contentEl = document.getElementById('prediction-content');
    
    loadingEl.classList.remove('hidden');
    contentEl.style.opacity = '0.5';
    
    try {
        const response = await fetch(`${API_BASE}/api/stock/${symbol}/prediction`);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        const sentimentBadge = document.getElementById('sentiment-badge');
        sentimentBadge.textContent = data.sentiment;
        sentimentBadge.className = `sentiment-badge ${data.sentiment.toLowerCase()}`;
        
        document.getElementById('confidence-fill').style.width = `${data.confidence}%`;
        document.getElementById('confidence-value').textContent = `${data.confidence}%`;
        
        document.getElementById('ai-analysis').textContent = data.analysis;
        
        const indicators = data.technicalIndicators;
        document.getElementById('ind-rsi').textContent = indicators.rsi;
        document.getElementById('ind-ma20').textContent = `$${indicators.movingAverage20}`;
        document.getElementById('ind-ma50').textContent = `$${indicators.movingAverage50}`;
        document.getElementById('ind-support').textContent = `$${indicators.support}`;
        document.getElementById('ind-resistance').textContent = `$${indicators.resistance}`;
        
        const targets = data.priceTargets;
        document.getElementById('target-conservative').textContent = `$${targets.conservative}`;
        document.getElementById('target-moderate').textContent = `$${targets.moderate}`;
        document.getElementById('target-aggressive').textContent = `$${targets.aggressive}`;
        
    } catch (error) {
        console.error('Error loading prediction:', error);
        document.getElementById('ai-analysis').textContent = 'Unable to load prediction. Please try again.';
    } finally {
        loadingEl.classList.add('hidden');
        contentEl.style.opacity = '1';
    }
}

async function loadTrendingStocks() {
    const grid = document.getElementById('trending-grid');
    
    try {
        const response = await fetch(`${API_BASE}/api/trending`);
        const stocks = await response.json();
        
        if (stocks.length === 0) {
            grid.innerHTML = '<div class="loading-placeholder">No trending stocks available</div>';
            return;
        }
        
        grid.innerHTML = stocks.map(stock => `
            <div class="trending-card" data-symbol="${stock.symbol}">
                <div class="symbol">${stock.symbol}</div>
                <div class="name">${stock.name}</div>
                <div class="price-row">
                    <span class="price">$${stock.price.toLocaleString()}</span>
                    <span class="change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                        ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%
                    </span>
                </div>
            </div>
        `).join('');
        
        grid.querySelectorAll('.trending-card').forEach(card => {
            card.addEventListener('click', () => {
                const symbol = card.dataset.symbol;
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.querySelector('.nav-link[data-page="home"]').classList.add('active');
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.getElementById('home-section').classList.add('active');
                document.getElementById('stock-search').value = symbol;
                loadStock(symbol);
            });
        });
    } catch (error) {
        console.error('Error loading trending:', error);
        grid.innerHTML = '<div class="loading-placeholder">Error loading trending stocks</div>';
    }
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num?.toLocaleString() || '0';
}

function formatMarketCap(cap) {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
}
