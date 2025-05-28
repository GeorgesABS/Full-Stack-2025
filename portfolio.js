class PortfolioManager {
	constructor() {
		this.holdings = this.loadHoldings();
		this.cryptoSymbols = [];

		this.init();
	}

	async init() {
		this.setupEventListeners();
		this.renderPortfolio();
		this.updatePortfolioSummary();

		// Wait for cryptoApp to be ready
		await this.waitForCryptoApp();
		await this.populateCryptoCurrencySelect();
	}

	setupEventListeners() {
		const form = document.getElementById("addHoldingForm");
		if (form) {
			form.addEventListener("submit", (e) => {
				e.preventDefault();
				this.addHolding();
			});
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
			if (!select) return;

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
		}
	}

	loadHoldings() {
		const stored = localStorage.getItem("cryptoHoldings");
		return stored ? JSON.parse(stored) : [];
	}

	saveHoldings() {
		localStorage.setItem("cryptoHoldings", JSON.stringify(this.holdings));
	}

	async addHolding() {
		const symbol = document.getElementById("cryptoSelect").value.trim();
		const amount = parseFloat(document.getElementById("amount").value);
		const purchasePrice = parseFloat(
			document.getElementById("purchasePrice").value
		);

		if (!symbol || !amount || !purchasePrice) {
			alert("Please fill in all fields");
			return;
		}

		// Get current price
		let currentPrice = purchasePrice; // Default to purchase price

		if (window.cryptoApp) {
			const priceData = await window.cryptoApp.fetchCryptoPrice(symbol);
			if (priceData && priceData.price) {
				currentPrice = priceData.price;
			}
		}

		const holding = {
			id: Date.now(),
			symbol: symbol,
			amount: amount,
			purchasePrice: purchasePrice,
			currentPrice: currentPrice,
			dateAdded: new Date().toISOString(),
		};

		this.holdings.push(holding);
		this.saveHoldings();
		this.renderPortfolio();
		this.updatePortfolioSummary();

		// Reset form
		document.getElementById("addHoldingForm").reset();

		// Show success message
		this.showSuccessMessage(`Added ${amount} ${symbol} to your portfolio`);
	}

	removeHolding(id) {
		if (confirm("Are you sure you want to remove this holding?")) {
			this.holdings = this.holdings.filter((h) => h.id !== id);
			this.saveHoldings();
			this.renderPortfolio();
			this.updatePortfolioSummary();
		}
	}

	async updateHoldingPrices() {
		if (!window.cryptoApp) {
			return;
		}

		for (let holding of this.holdings) {
			try {
				const priceData = await window.cryptoApp.fetchCryptoPrice(
					holding.symbol
				);
				if (priceData && priceData.price) {
					holding.currentPrice = priceData.price;
				}
			} catch (error) {
				console.error(
					`Error updating price for ${holding.symbol}:`,
					error
				);
			}
		}

		this.saveHoldings();
		this.renderPortfolio();
		this.updatePortfolioSummary();
	}

	renderPortfolio() {
		const emptyState = document.getElementById("portfolioEmpty");
		const holdingsContainer = document.getElementById("portfolioHoldings");
		const tableBody = document.getElementById("holdingsTableBody");

		if (this.holdings.length === 0) {
			if (emptyState) emptyState.style.display = "block";
			if (holdingsContainer) holdingsContainer.classList.add("d-none");
			return;
		}

		if (emptyState) emptyState.style.display = "none";
		if (holdingsContainer) holdingsContainer.classList.remove("d-none");

		if (!tableBody) return;

		tableBody.innerHTML = "";

		this.holdings.forEach((holding) => {
			const currentValue = holding.amount * holding.currentPrice;
			const purchaseValue = holding.amount * holding.purchasePrice;
			const pnl = currentValue - purchaseValue;
			const pnlPercentage = (pnl / purchaseValue) * 100;

			const pnlClass =
				pnl > 0
					? "text-success"
					: pnl < 0
					? "text-danger"
					: "text-muted";
			const pnlIcon =
				pnl > 0 ? "bi-arrow-up" : pnl < 0 ? "bi-arrow-down" : "bi-dash";

			const row = document.createElement("tr");
			row.innerHTML = `
                <td>
                    <strong>${holding.symbol}</strong>
                    <br>
                    <small class="text-muted">${this.formatDate(
						holding.dateAdded
					)}</small>
                </td>
                <td>$${holding.amount.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</td>
                <td>$${holding.currentPrice.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</td>
                <td>$${currentValue.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</td>
                <td>$${holding.purchasePrice.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</td>
                <td class="${pnlClass}">
                    <i class="bi ${pnlIcon} me-1"></i>
                    $${Math.abs(pnl).toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}
                    <br>
                    <small>(${pnlPercentage.toFixed(2)}%)</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="portfolioManager.updateSingleHolding(${
						holding.id
					})" title="Update Price">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="portfolioManager.removeHolding(${
						holding.id
					})" title="Remove">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

			tableBody.appendChild(row);
		});
	}

	async updateSingleHolding(id) {
		const holding = this.holdings.find((h) => h.id === id);
		if (!holding || !window.cryptoApp) {
			return;
		}

		try {
			const priceData = await window.cryptoApp.fetchCryptoPrice(
				holding.symbol
			);
			if (priceData && priceData.price) {
				holding.currentPrice = priceData.price;
				this.saveHoldings();
				this.renderPortfolio();
				this.updatePortfolioSummary();
				this.showSuccessMessage(`Updated ${holding.symbol} price`);
			}
		} catch (error) {
			console.error(`Error updating price for ${holding.symbol}:`, error);
			this.showErrorMessage(`Failed to update ${holding.symbol} price`);
		}
	}

	updatePortfolioSummary() {
		const totalValueElement = document.getElementById("totalValue");
		const totalPnLElement = document.getElementById("totalPnL");
		const totalHoldingsElement = document.getElementById("totalHoldings");

		if (!totalValueElement || !totalPnLElement || !totalHoldingsElement) {
			return;
		}

		let totalValue = 0;
		let totalPurchaseValue = 0;

		this.holdings.forEach((holding) => {
			totalValue += holding.amount * holding.currentPrice;
			totalPurchaseValue += holding.amount * holding.purchasePrice;
		});

		const totalPnL = totalValue - totalPurchaseValue;

		totalValueElement.textContent = `$${totalValue.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
		totalHoldingsElement.textContent = this.holdings.length;

		// Update P&L with color
		totalPnLElement.textContent = `$${Math.abs(totalPnL).toLocaleString(
			"en-US",
			{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
		)}`;
		totalPnLElement.className =
			totalPnL > 0
				? "text-success"
				: totalPnL < 0
				? "text-danger"
				: "text-muted";
	}

	formatDate(dateString) {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	showSuccessMessage(message) {
		this.showToast(message, "success");
	}

	showErrorMessage(message) {
		this.showToast(message, "danger");
	}

	showToast(message, type = "info") {
		// Create toast container if it doesn't exist
		let toastContainer = document.getElementById("toastContainer");
		if (!toastContainer) {
			toastContainer = document.createElement("div");
			toastContainer.id = "toastContainer";
			toastContainer.className =
				"toast-container position-fixed top-0 end-0 p-3";
			toastContainer.style.zIndex = "9999";
			document.body.appendChild(toastContainer);
		}

		const toast = document.createElement("div");
		toast.className = `toast align-items-center text-white bg-${type} border-0`;
		toast.setAttribute("role", "alert");
		toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

		toastContainer.appendChild(toast);

		const bootstrapToast = new bootstrap.Toast(toast, {
			delay: 3000,
		});
		bootstrapToast.show();

		// Remove toast element after it's hidden
		toast.addEventListener("hidden.bs.toast", () => {
			toast.remove();
		});
	}
}

// Initialize portfolio manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	window.portfolioManager = new PortfolioManager();
});
