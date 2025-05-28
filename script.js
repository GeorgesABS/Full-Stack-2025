// API Configuration
const API_CONFIG = {
	BINANCE_BASE_URL: "https://api.binance.com/api/v3/ticker/price",
	FINNHUB_BASE_URL: "https://finnhub.io/api/v1/crypto/symbol",
	FINNHUB_API_KEY: "d0r1ichr01qn4tjft0tgd0r1ichr01qn4tjft0u0",
};

// Main CryptoApp Class
class CryptoApp {
	constructor() {
		if (!API_CONFIG.FINNHUB_API_KEY) {
			this.apiFinnhubApiKey = localStorage.getItem("apiFinnhubApiKey");
		} else {
			this.apiFinnhubApiKey = API_CONFIG.FINNHUB_API_KEY;
		}

		this.popularCryptos = [
			"BTCUSDC",
			"ETHUSDT",
			"LTCBTC",
			"XRPBTC",
			"TRXBTC",
			"BCHBTC",
		];

		this.cryptoData = new Map();
		this.lastUpdate = null;
		this.cryptoSymbols = [];
		this.choices = new Choices(document.getElementById("cryptoSelect"), {
			searchEnabled: true,
			itemSelectText: "",
			shouldSort: false,
		});

		this.init();
	}

	init() {
		this.setupEventListeners();
		this.checkApiKey();
		this.populateCryptoSelect();
		this.loadPopularCryptos();
		this.setupScrollAnimations();
	}

	checkApiKey() {
		if (!this.apiFinnhubApiKey) {
			this.showApiKeyModal();
		}
	}

	showApiKeyModal() {
		const modal = document.createElement("div");
		modal.className = "modal fade";
		modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">API Key Required</h5>
                    </div>
                    <div class="modal-body">
						<p>To fetch cryptocurrency symbols, please enter your API Finnhub API key:</p>
                        <div class="mb-3">
                            <label for="apiFinnhubKeyInput" class="form-label">API Key</label>
                            <input type="text" class="form-control" id="apiFinnhubKeyInput" placeholder="Your Finnhub API Key">
                        </div>
                        <p class="text-muted small">
                            Get your free API key at <a href="https://finnhub.io" target="_blank">Finnhub</a>
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="cryptoApp.saveApiKey()">Save Key</button>
                        <button type="button" class="btn btn-secondary" onclick="cryptoApp.useDemoMode()">Use Demo Mode</button>
                    </div>
                </div>
            </div>
        `;
		document.body.appendChild(modal);

		const bootstrapModal = new bootstrap.Modal(modal);
		bootstrapModal.show();
	}

	saveApiKey() {
		const apiFinnhubKey = document
			.getElementById("apiFinnhubKeyInput")
			.value.trim();

		if (apiFinnhubKey) {
			this.apiFinnhubApiKey = apiFinnhubKey;

			localStorage.setItem("apiFinnhubApiKey", apiFinnhubKey);

			API_CONFIG.FINNHUB_API_KEY = apiFinnhubKey;

			// Close modal
			const modal = bootstrap.Modal.getInstance(
				document.querySelector(".modal")
			);
			modal.hide();

			// Load data
			this.loadPopularCryptos();
			this.populateCryptoSelect();
		} else {
			alert("Please enter a valid API key");
		}
	}

	useDemoMode() {
		// Close modal
		const modal = bootstrap.Modal.getInstance(
			document.querySelector(".modal")
		);
		modal.hide();

		// Load demo data
		this.loadDemoData();
	}

	setupEventListeners() {
		// Search functionality
		const searchInput = document.getElementById("cryptoSelect");
		if (searchInput) {
			searchInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					this.searchCrypto();
				}
			});
		}

		// Smooth scrolling
		document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
			anchor.addEventListener("click", function (e) {
				e.preventDefault();
				const target = document.querySelector(
					this.getAttribute("href")
				);
				if (target) {
					target.scrollIntoView({
						behavior: "smooth",
						block: "start",
					});
				}
			});
		});
	}

	setupScrollAnimations() {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("animate");
					}
				});
			},
			{ threshold: 0.1 }
		);

		// Observe all elements with scroll-animate class
		document.querySelectorAll(".scroll-animate").forEach((el) => {
			observer.observe(el);
		});
	}

	async fetchCryptoPrice(symbol) {
		this.showLoading(true);
		this.hideError();

		try {
			const response = await fetch(
				`${API_CONFIG.BINANCE_BASE_URL}?symbol=${encodeURIComponent(
					symbol
				)}`,
				{
					method: "GET",
				}
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.price === undefined) {
				throw new Error("Invalid cryptocurrency symbol");
			}

			return {
				symbol: symbol,
				price: parseFloat(data.price),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Error fetching crypto price:", error);
			this.showError(`Error fetching ${symbol}: ${error.message}`);
			return null;
		} finally {
			this.showLoading(false);
		}
	}

	async fetchCryptoSymbols() {
		let cryptoSymbols = [];

		try {
			if (!this.apiFinnhubApiKey) {
				throw new Error("Finnhub API key not configured");
			}

			const response = await fetch(
				`${
					API_CONFIG.FINNHUB_BASE_URL
				}?exchange=binance&token=${encodeURIComponent(
					this.apiFinnhubApiKey
				)}`,
				{
					method: "GET",
				}
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data === undefined || data.length === 0) {
				throw new Error("No crypto symbols found !");
			}

			for (const cryptoSymbol of data) {
				const raw = cryptoSymbol.symbol;
				const clean = raw.split(":")[1];
				cryptoSymbols.push(clean);
			}

			return cryptoSymbols;
		} catch (error) {
			console.error("Error fetching crypto symbols: ", error);
			this.showError(`Error fetching crypto symbols: ${error.message}`);
		}
	}

	async populateCryptoSelect() {
		const select = document.getElementById("cryptoSelect");
		if (!select) return;

		this.cryptoSymbols = await this.fetchCryptoSymbols();

		// Format and inject all at once
		const formattedChoices = this.cryptoSymbols.map((sym) => ({
			value: sym,
			label: sym,
		}));

		this.choices.setChoices(formattedChoices, "value", "label", true);
	}

	async loadPopularCryptos() {
		const cryptoGrid = document.getElementById("crypto-grid");

		if (!cryptoGrid) return;

		cryptoGrid.innerHTML = "";
		// Deselect current select item
		if (this.choices) {
			this.choices.removeActiveItems(); // Clears selection
		}

		for (const crypto of this.popularCryptos) {
			const data = await this.fetchCryptoPrice(crypto);
			if (data) {
				this.cryptoData.set(crypto, data);
				this.renderCryptoCard(data);
			} else {
				// Render placeholder for failed requests
				this.renderCryptoCard({
					symbol: crypto,
					price: 0,
					error: true,
				});
			}
		}

		this.lastUpdate = new Date();
		this.updateLastUpdateTime();
	}

	loadDemoData() {
		const demoData = [
			{ symbol: "BTCUSDC", price: 45230.5 },
			{ symbol: "ETHUSDT", price: 3150.75 },
			{ symbol: "ALTUSDT", price: 1.25 },
			{ symbol: "DOGETUSD", price: 35.8 },
			{ symbol: "HIGHBNB", price: 28.4 },
			{ symbol: "CNDETH", price: 165.3 },
		];

		const cryptoGrid = document.getElementById("crypto-grid");
		if (!cryptoGrid) return;

		cryptoGrid.innerHTML = "";

		demoData.forEach((data) => {
			this.cryptoData.set(data.symbol, data);
			this.renderCryptoCard(data);
		});

		this.lastUpdate = new Date();
		this.updateLastUpdateTime();

		// Show demo notice
		this.showDemoNotice();
	}

	showDemoNotice() {
		const notice = document.createElement("div");
		notice.className = "alert alert-info alert-dismissible fade show";
		notice.innerHTML = `
            <i class="bi bi-info-circle me-2"></i>
            <strong>Demo Mode:</strong> Showing sample data. Enter your API key for real-time prices.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

		const container = document.querySelector("#crypto-prices .container");
		if (container) {
			container.insertBefore(notice, container.firstChild);
		}
	}

	renderCryptoCard(data) {
		const cryptoGrid = document.getElementById("crypto-grid");
		if (!cryptoGrid) return;

		const priceFormatted = data.error
			? "Error"
			: `$${data.price.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 8,
			  })}`;

		const priceChange = this.calculatePriceChange(data.symbol);
		const changeClass =
			priceChange > 0
				? "price-positive"
				: priceChange < 0
				? "price-negative"
				: "price-neutral";
		const changeIcon =
			priceChange > 0
				? "bi-arrow-up"
				: priceChange < 0
				? "bi-arrow-down"
				: "bi-dash";

		const card = document.createElement("div");
		card.className = "col-lg-4 col-md-6 mb-4";
		card.innerHTML = `
            <div class="card crypto-card h-100 shadow-sm">
                <div class="card-body text-center">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">${data.symbol}</h5>
                        <span class="badge bg-primary">${this.getCryptoSymbol(
							data.symbol
						)}</span>
                    </div>
                    <h3 class="text-primary mb-3">${priceFormatted}</h3>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>
                            ${this.formatTime(
								data.timestamp || new Date().toISOString()
							)}
                        </small>
                        <span class="badge ${changeClass}">
                            <i class="bi ${changeIcon} me-1"></i>
                            ${Math.abs(priceChange).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        `;

		cryptoGrid.appendChild(card);
	}

	getCryptoSymbol(name) {
		const symbols = {
			Bitcoin: "BTC",
			Ethereum: "ETH",
			Cardano: "ADA",
			Polkadot: "DOT",
			Chainlink: "LINK",
			Litecoin: "LTC",
		};
		return symbols[name] || name.substring(0, 3).toUpperCase();
	}

	calculatePriceChange(symbol) {
		// Simulate price change for demo purposes
		return (Math.random() - 0.5) * 10;
	}

	formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	async searchCrypto() {
		const searchInput = document.getElementById("cryptoSelect");

		const query = searchInput.value.trim();

		if (!query || query.includes("select")) {
			alert("Please select a cryptocurrency symbol");
			return;
		}

		const data = await this.fetchCryptoPrice(query);
		if (data) {
			// Clear grid and show single result
			const cryptoGrid = document.getElementById("crypto-grid");
			cryptoGrid.innerHTML = "";
			this.renderCryptoCard(data);

			// Clear search input
			searchInput.value = "";
		}
	}

	updateLastUpdateTime() {
		const lastUpdatedElement = document.getElementById("lastUpdated");
		if (lastUpdatedElement && this.lastUpdate) {
			lastUpdatedElement.textContent = this.lastUpdate.toLocaleTimeString(
				"en-US",
				{
					hour12: true,
					hour: "2-digit",
					minute: "2-digit",
				}
			);
		}
	}

	showLoading(show) {
		const loading = document.getElementById("loading");
		if (loading) {
			loading.classList.toggle("d-none", !show);
		}
	}

	showError(message) {
		const errorDiv = document.getElementById("error-message");
		const errorText = document.getElementById("error-text");

		if (errorDiv && errorText) {
			errorText.textContent = message;
			errorDiv.classList.remove("d-none");

			// Auto-hide error after 5 seconds
			setTimeout(() => {
				this.hideError();
			}, 5000);
		}
	}

	hideError() {
		const errorDiv = document.getElementById("error-message");
		if (errorDiv) {
			errorDiv.classList.add("d-none");
		}
	}
}

// Utility Functions
function scrollToSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (section) {
		section.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	window.cryptoApp = new CryptoApp();

	// Initialize Bootstrap tooltips
	const tooltipTriggerList = [].slice.call(
		document.querySelectorAll('[data-bs-toggle="tooltip"]')
	);
	tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl);
	});
});

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
	module.exports = { CryptoApp };
}
