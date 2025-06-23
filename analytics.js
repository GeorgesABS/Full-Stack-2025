// Analytics JavaScript ES6 Class

class AnalyticsManager {
	constructor() {
		this.marketData = new Map();

		this.cryptoSymbols = [];

		this.choices2 = new Choices(document.getElementById("cryptoSelect2"), {
			searchEnabled: true,
			itemSelectText: "",
			shouldSort: false,
		});

		this.choices3 = new Choices(document.getElementById("cryptoSelect3"), {
			searchEnabled: true,
			itemSelectText: "",
			shouldSort: false,
		});

		this.init();
	}

	async init() {
		this.loadMarketOverview();
		this.setupEventListeners();
		this.updateAnalyticsPrices();

		// Wait for cryptoApp to be ready
		await this.waitForCryptoApp();
		await this.populateCryptoCurrencySelect();
	}

	setupEventListeners() {
		// Add event listeners for analytics tools
		const compareBtn = document.querySelector(
			'[onclick="analyticsApp.comparePrices()"]'
		);
		const calculateBtn = document.querySelector(
			'[onclick="analyticsApp.calculateInvestment()"]'
		);

		// Replace onclick with proper event listeners
		if (compareBtn) {
			compareBtn.removeAttribute("onclick");
			compareBtn.addEventListener("click", () => this.comparePrices());
		}

		if (calculateBtn) {
			calculateBtn.removeAttribute("onclick");
			calculateBtn.addEventListener("click", () =>
				this.calculateInvestment()
			);
		}
	}

	waitForCryptoApp() {
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (window.cryptoApp) {
					clearInterval(interval);
					resolve();
				}
			}, 50);
		});
	}

	async populateCryptoCurrencySelect() {
		if (window.cryptoApp) {
			const select = document.getElementById("cryptoSelect");
			const select2 = document.getElementById("cryptoSelect2");
			const select3 = document.getElementById("cryptoSelect3");

			if (!select || !select2 || !select3) return;

			this.cryptoSymbols = await window.cryptoApp.fetchCryptoSymbols();

			// Format and inject all at once
			const formattedChoices = this.cryptoSymbols.map((sym) => ({
				value: sym,
				label: sym,
			}));

			window.cryptoApp.choices.setChoices(
				formattedChoices,
				"value",
				"label",
				true
			);

			this.choices2.setChoices(formattedChoices, "value", "label", true);
			this.choices3.setChoices(formattedChoices, "value", "label", true);
		}
	}

	async loadMarketOverview() {
		// Load key market indicators
		await this.updateBitcoinPrice();
		await this.updateEthereumPrice();
		this.updateMarketTrend();
		this.updateLastUpdated();
	}

	async updateBitcoinPrice() {
		const btcElement = document.getElementById("btcPrice");
		if (!btcElement) return;

		try {
			if (window.cryptoApp) {
				const data = await window.cryptoApp.fetchCryptoPrice("BTCUSDT");
				if (data && data.price) {
					btcElement.textContent = `$${data.price.toLocaleString(
						"en-US",
						{
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						}
					)}`;
					this.marketData.set("Bitcoin", data.price);
					return;
				}
			}

			// Demo data
			const demoPrice = 45230.5;
			btcElement.textContent = `$${demoPrice.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}`;
			this.marketData.set("Bitcoin", demoPrice);
		} catch (error) {
			console.error("Error loading Bitcoin price:", error);
			btcElement.textContent = "Error";
		}
	}

	async updateEthereumPrice() {
		const ethElement = document.getElementById("ethPrice");
		if (!ethElement) return;

		try {
			if (window.cryptoApp) {
				const data = await window.cryptoApp.fetchCryptoPrice("ETHUSDT");
				if (data && data.price) {
					ethElement.textContent = `$${data.price.toLocaleString(
						"en-US",
						{
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						}
					)}`;
					this.marketData.set("Ethereum", data.price);
					return;
				}
			}

			// Demo data
			const demoPrice = 3150.75;
			ethElement.textContent = `$${demoPrice.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}`;
			this.marketData.set("Ethereum", demoPrice);
		} catch (error) {
			console.error("Error loading Ethereum price:", error);
			ethElement.textContent = "Error";
		}
	}

	updateMarketTrend() {
		const trendElement = document.getElementById("marketTrend");
		if (!trendElement) return;

		// Simulate market trend analysis
		const trends = [
			"Bullish 📈",
			"Bearish 📉",
			"Sideways ➡️",
			"Volatile ⚡",
		];
		const randomTrend = trends[Math.floor(Math.random() * trends.length)];

		trendElement.textContent = randomTrend;

		// Add appropriate color class
		const colorClasses = {
			"Bullish 📈": "text-success",
			"Bearish 📉": "text-danger",
			"Sideways ➡️": "text-warning",
			"Volatile ⚡": "text-info",
		};

		trendElement.className = colorClasses[randomTrend] || "text-warning";
	}

	updateLastUpdated() {
		const lastUpdatedElement = document.getElementById("lastUpdated");
		if (lastUpdatedElement) {
			lastUpdatedElement.textContent = new Date().toLocaleTimeString(
				"en-US",
				{
					hour12: true,
					hour: "2-digit",
					minute: "2-digit",
				}
			);
		}
	}

	async updateAnalyticsPrices() {
		await this.updateBitcoinPrice();
		await this.updateEthereumPrice();
		this.updateMarketTrend();
		this.updateLastUpdated();
	}

	async comparePrices() {
		const crypto1 = document.getElementById("cryptoSelect").value.trim();
		const crypto2 = document.getElementById("cryptoSelect2").value.trim();
		const resultDiv = document.getElementById("comparisonResult");

		if (!crypto1 || !crypto2) {
			this.showAlert(
				"Please enter both cryptocurrency names",
				"warning",
				resultDiv
			);
			return;
		}

		if (crypto1.toLowerCase() === crypto2.toLowerCase()) {
			this.showAlert(
				"Please enter different cryptocurrencies",
				"warning",
				resultDiv
			);
			return;
		}

		resultDiv.innerHTML =
			'<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Comparing prices...</div>';

		try {
			let price1, price2;

			if (window.cryptoApp) {
				// Fetch real data
				const [data1, data2] = await Promise.all([
					window.cryptoApp.fetchCryptoPrice(crypto1),
					window.cryptoApp.fetchCryptoPrice(crypto2),
				]);

				if (!data1 || !data2) {
					throw new Error("Failed to fetch price data");
				}

				price1 = data1.price;
				price2 = data2.price;
			} else {
				// Use demo data
				price1 = this.getDemoPrice(crypto1);
				price2 = this.getDemoPrice(crypto2);
			}

			const ratio = price1 / price2;
			const difference = Math.abs(price1 - price2);
			const percentageDiff = (
				(difference / Math.min(price1, price2)) *
				100
			).toFixed(2);

			const higherCrypto = price1 > price2 ? crypto1 : crypto2;
			const lowerCrypto = price1 > price2 ? crypto2 : crypto1;

			resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h6 class="alert-heading">Price Comparison Results</h6>
                    <div class="row text-center">
                        <div class="col-6">
                            <strong>${crypto1}</strong><br>
                            $${price1.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
                        </div>
                        <div class="col-6">
                            <strong>${crypto2}</strong><br>
                            $${price2.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
                        </div>
                    </div>
                    <hr>
                    <p class="mb-0">
                        <strong>${higherCrypto}</strong> is ${percentageDiff}% more expensive than <strong>${lowerCrypto}</strong><br>
                        <small class="text-muted">Ratio: 1 ${crypto1} = ${ratio.toFixed(
				4
			)} ${crypto2}</small>
                    </p>
                </div>
            `;
		} catch (error) {
			console.error("Error comparing prices:", error);
			this.showAlert(
				"Error comparing prices. Please try again.",
				"danger",
				resultDiv
			);
		}
	}

	async calculateInvestment() {
		const amount = parseFloat(
			document.getElementById("investAmount").value
		);
		const crypto = document.getElementById("cryptoSelect3").value.trim();
		const resultDiv = document.getElementById("calculationResult");

		if (!amount || amount <= 0) {
			this.showAlert(
				"Please enter a valid investment amount",
				"warning",
				resultDiv
			);
			return;
		}

		if (!crypto) {
			this.showAlert(
				"Please enter a cryptocurrency name",
				"warning",
				resultDiv
			);
			return;
		}

		resultDiv.innerHTML =
			'<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Calculating...</div>';

		try {
			let price;

			if (window.cryptoApp) {
				const data = await window.cryptoApp.fetchCryptoPrice(crypto);
				if (!data) {
					throw new Error("Failed to fetch price data");
				}
				price = data.price;
			} else {
				price = this.getDemoPrice(crypto);
			}

			const cryptoAmount = amount / price;
			const fees = amount * 0.01; // Assume 1% fee
			const netAmount = amount - fees;
			const netCryptoAmount = netAmount / price;

			resultDiv.innerHTML = `
                <div class="alert alert-info">
                    <h6 class="alert-heading">Investment Calculation</h6>
                    <div class="row">
                        <div class="col-sm-6">
                            <strong>Investment:</strong> $${amount.toLocaleString(
								"en-US",
								{ minimumFractionDigits: 2 }
							)}<br>
                            <strong>Current Price:</strong> $${price.toLocaleString(
								"en-US",
								{
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}
							)}
                        </div>
                        <div class="col-sm-6">
                            <strong>Estimated Fees:</strong> $${fees.toFixed(
								2
							)}<br>
                            <strong>Net Investment:</strong> $${netAmount.toFixed(
								2
							)}
                        </div>
                    </div>
                    <hr>
                    <p class="mb-0">
                        <strong>You would get approximately:</strong><br>
                        <span class="h5 text-primary">${netCryptoAmount.toFixed(
							8
						)} ${crypto}</span><br>
                        <small class="text-muted">(Before fees: ${cryptoAmount.toFixed(
							8
						)} ${crypto})</small>
                    </p>
                </div>
            `;
		} catch (error) {
			console.error("Error calculating investment:", error);
			this.showAlert(
				"Error calculating investment. Please try again.",
				"danger",
				resultDiv
			);
		}
	}

	getDemoPrice(crypto) {
		const demoPrices = {
			Bitcoin: 45230.5,
			Ethereum: 3150.75,
			Cardano: 1.25,
			Polkadot: 35.8,
			Chainlink: 28.4,
			Litecoin: 165.3,
		};

		// Return demo price or generate random price for unknown cryptos
		return demoPrices[crypto] || Math.random() * 1000 + 10;
	}

	showAlert(message, type, container) {
		container.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
	}
}

// Initialize analytics manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	window.analyticsApp = new AnalyticsManager();
});
