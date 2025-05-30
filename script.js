document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const eodApiKey = 'demo'; // EODHistoricalData demo token
    const symbol = 'AMZN';
    const apiUrl = `https://eodhistoricaldata.com/api/eod/${symbol}.US?api_token=${eodApiKey}&format=json`;

    let fullTimeSeriesData = {}; // Initialize as an empty object

    stockDataElement.innerHTML = '<p>Fetching latest stock data for AMZN...</p>';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(`HTTP error! status: ${response.status}. EODHD Message: ${JSON.stringify(errData)}`);
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                if (data.error) {
                     throw new Error(`EODHD API Error: ${data.error}`);
                }
                throw new Error(`EODHD API Error: Expected an array but received: ${JSON.stringify(data)}`);
            }
            if (data.length === 0) {
                throw new Error('Invalid API response: No historical data found in EODHD response (empty array).');
            }

            // Populate fullTimeSeriesData using EODHD data array
            // Store EODHD's 'adjusted_close' as 'close' in our internal structure
            data.forEach(dailyData => {
                if (dailyData.date) { // EODHD 'date' is YYYY-MM-DD
                    fullTimeSeriesData[dailyData.date] = {
                        open: dailyData.open,
                        high: dailyData.high,
                        low: dailyData.low,
                        close: dailyData.adjusted_close, // Crucial: use adjusted_close from EODHD
                        volume: dailyData.volume
                    };
                }
            });

            // Initial display using the last item from the EODHD array (newest)
            const latestDataEODHD = data[data.length - 1];
            if (!latestDataEODHD) {
                // This should be caught by data.length === 0, but as a safeguard
                throw new Error('No latest data point found in EODHD response for initial display.');
            }
            const displayDate = latestDataEODHD.date;
            const open = parseFloat(latestDataEODHD.open).toFixed(2);
            const high = parseFloat(latestDataEODHD.high).toFixed(2);
            const low = parseFloat(latestDataEODHD.low).toFixed(2);
            // For display, explicitly use adjusted_close and label it as such
            const adjustedCloseDisplay = parseFloat(latestDataEODHD.adjusted_close).toFixed(2);
            const volume = latestDataEODHD.volume;

            stockDataElement.innerHTML = `
                <p><strong>Date:</strong> ${displayDate}</p>
                <p><strong>Open:</strong> $${open}</p>
                <p><strong>High:</strong> $${high}</p>
                <p><strong>Low:</strong> $${low}</p>
                <p><strong>Adjusted Close:</strong> $${adjustedCloseDisplay}</p>
                <p><strong>Volume:</strong> ${volume}</p>
            `;
        })
        .catch(error => {
            console.error('Error fetching stock data:', error);
            stockDataElement.innerHTML = `<p class="error">Could not retrieve stock data: ${error.message}</p>`;
        });

    document.getElementById('calculate-btn').addEventListener('click', function() {
        const selectedDateStr = document.getElementById('historical-date').value;
        const percentageIncreaseEl = document.getElementById('percentage-increase');
        const apyResultEl = document.getElementById('apy-result');
        const errorMessageCalcEl = document.getElementById('error-message-calc');

        percentageIncreaseEl.textContent = '';
        apyResultEl.textContent = '';
        errorMessageCalcEl.textContent = '';

        try {
            if (Object.keys(fullTimeSeriesData).length === 0) {
                errorMessageCalcEl.textContent = 'Historical data not yet loaded or processed. Please wait or refresh.';
                return;
            }

            if (!selectedDateStr) {
                errorMessageCalcEl.textContent = 'Please select a date.';
                return;
            }

            let actualHistoricalDateStr = selectedDateStr;
            let historicalData = fullTimeSeriesData[actualHistoricalDateStr];
            let attempts = 0;
            const maxAttempts = 7;

            while (!historicalData && attempts < maxAttempts) {
                errorMessageCalcEl.textContent = `No data for ${actualHistoricalDateStr}. Trying previous day...`;
                const currentDate = new Date(actualHistoricalDateStr);
                currentDate.setDate(currentDate.getDate() - 1);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                actualHistoricalDateStr = `${year}-${month}-${day}`;

                historicalData = fullTimeSeriesData[actualHistoricalDateStr];
                attempts++;
            }

            errorMessageCalcEl.textContent = '';

            if (!historicalData) {
                errorMessageCalcEl.textContent = `No data available for selected date ${selectedDateStr} or nearby prior trading days.`;
                return;
            }

            // Calculation logic now uses 'close' which holds adjusted_close from EODHD
            const historicalClose = parseFloat(historicalData.close);

            const allDates = Object.keys(fullTimeSeriesData);
            if (allDates.length === 0) {
                 errorMessageCalcEl.textContent = 'No dates available in processed historical data.';
                 return;
            }
            allDates.sort((a, b) => b.localeCompare(a));
            const latestDateStr = allDates[0];

            const latestDataForCalc = fullTimeSeriesData[latestDateStr];
            if (!latestDataForCalc) {
                 errorMessageCalcEl.textContent = `Missing data for the determined latest date: ${latestDateStr}`;
                 return;
            }
            // Calculation logic now uses 'close' which holds adjusted_close from EODHD
            const latestClose = parseFloat(latestDataForCalc.close);

            if (historicalClose <= 0) {
                errorMessageCalcEl.textContent = 'Historical adjusted closing price is zero or negative.'; // Message updated for clarity
                return;
            }

            const date1 = new Date(actualHistoricalDateStr);
            const date2 = new Date(latestDateStr);

            if (date1 >= date2) {
                errorMessageCalcEl.textContent = `Found historical date (${actualHistoricalDateStr}) must be before latest day (${latestDateStr}).`;
                return;
            }

            const percentageIncrease = ((latestClose - historicalClose) / historicalClose) * 100;
            const timeDiffMillis = date2 - date1;
            const years = timeDiffMillis / (1000 * 60 * 60 * 24 * 365.25);

            if (years <= 0) {
                errorMessageCalcEl.textContent = 'Time difference too short for APY.';
                return;
            }

            const apy = (Math.pow(latestClose / historicalClose, 1 / years) - 1) * 100;

            let dateNotice = '';
            if (selectedDateStr !== actualHistoricalDateStr) {
                dateNotice = ` (Data from ${actualHistoricalDateStr} as ${selectedDateStr} was non-trading/no data)`;
            }
            // Message updated to reflect that calculations are based on adjusted close prices
            percentageIncreaseEl.textContent = `Increase (Adjusted Close) since ${selectedDateStr}${dateNotice}: ${percentageIncrease.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr})`;
            apyResultEl.textContent = `Equivalent APY (Adjusted Close): ${apy.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr})`;

        } catch (error) {
            console.error('Error during calculation:', error);
            errorMessageCalcEl.textContent = `An unexpected error occurred: ${error.message}.`;
        }
    });
});
