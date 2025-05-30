document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const fmpApiKey = 'demo'; // Replace with your FMP key if 'demo' is too limited
    const symbol = 'AMZN';
    const apiUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${fmpApiKey}`;

    let fullTimeSeriesData = {}; // Initialize as an empty object

    stockDataElement.innerHTML = '<p>Fetching latest stock data for AMZN...</p>';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data['Error Message']) {
                throw new Error(`FMP API Error: ${data['Error Message']}`);
            }

            const historicalArray = data.historical;
            if (!historicalArray || historicalArray.length === 0) {
                throw new Error('Invalid API response: No historical data found in FMP response.');
            }

            historicalArray.forEach(dailyData => {
                if (dailyData.date) {
                    fullTimeSeriesData[dailyData.date] = {
                        open: dailyData.open,
                        high: dailyData.high,
                        low: dailyData.low,
                        close: dailyData.close,
                        volume: dailyData.volume
                    };
                }
            });

            const latestDataFMP = historicalArray[0];
            if (!latestDataFMP) {
                throw new Error('No latest data point found in FMP historical array for initial display.');
            }
            const displayDate = latestDataFMP.date;
            const open = parseFloat(latestDataFMP.open).toFixed(2);
            const high = parseFloat(latestDataFMP.high).toFixed(2);
            const low = parseFloat(latestDataFMP.low).toFixed(2);
            const close = parseFloat(latestDataFMP.close).toFixed(2);
            const volume = latestDataFMP.volume;

            stockDataElement.innerHTML = `
                <p><strong>Date:</strong> ${displayDate}</p>
                <p><strong>Open:</strong> $${open}</p>
                <p><strong>High:</strong> $${high}</p>
                <p><strong>Low:</strong> $${low}</p>
                <p><strong>Close:</strong> $${close}</p>
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

            const historicalClose = parseFloat(historicalData.close);

            // Robustly find the latest date from fullTimeSeriesData
            const allDates = Object.keys(fullTimeSeriesData);
            if (allDates.length === 0) {
                 errorMessageCalcEl.textContent = 'No dates available in processed historical data.';
                 return;
            }
            allDates.sort((a, b) => b.localeCompare(a)); // Sorts descending (e.g., "2023-10-26" comes before "2023-10-25")
            const latestDateStr = allDates[0]; // The first element is now the latest date

            const latestDataForCalc = fullTimeSeriesData[latestDateStr];
            if (!latestDataForCalc) {
                 errorMessageCalcEl.textContent = `Missing data for the determined latest date: ${latestDateStr}`;
                 return;
            }
            const latestClose = parseFloat(latestDataForCalc.close);

            if (historicalClose <= 0) {
                errorMessageCalcEl.textContent = 'Historical closing price is zero or negative.';
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
            percentageIncreaseEl.textContent = `Increase since ${selectedDateStr}${dateNotice}: ${percentageIncrease.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr})`;
            apyResultEl.textContent = `Equivalent APY: ${apy.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr})`;

        } catch (error) {
            console.error('Error during calculation:', error);
            errorMessageCalcEl.textContent = `An unexpected error occurred: ${error.message}.`;
        }
    });
});
