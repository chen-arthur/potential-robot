document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const apiKey = 'DEMO'; // Replace with your own Alpha Vantage API key if needed
    const symbol = 'AMZN';
    // Modified apiUrl to include outputsize=full
    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;

    let fullTimeSeriesData = null; // Variable to hold full time series data

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
                // Handle API limit error specifically for DEMO key
                if (data['Error Message'].includes("Our standard API call frequency is 5 calls per minute and 100 calls per day.")) {
                     throw new Error(`API Call Limit Reached: ${data['Error Message']}. Please try again later or use your own API key.`);
                }
                throw new Error(`API Error: ${data['Error Message']}`);
            }

            const timeSeries = data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: Time Series (Daily) data is missing.');
            }

            fullTimeSeriesData = timeSeries; // Store full time series data

            const dates = Object.keys(fullTimeSeriesData);
            if (dates.length === 0) {
                throw new Error('Invalid API response: No dates found in time series.');
            }
            const latestDate = dates[0]; // Alpha Vantage returns data in reverse chronological order
            const latestData = fullTimeSeriesData[latestDate];

            if (!latestData) {
                throw new Error(`No data found for ${latestDate}.`);
            }

            const open = parseFloat(latestData['1. open']).toFixed(2);
            const high = parseFloat(latestData['2. high']).toFixed(2);
            const low = parseFloat(latestData['3. low']).toFixed(2);
            const close = parseFloat(latestData['4. close']).toFixed(2);
            const volume = latestData['5. volume'];

            stockDataElement.innerHTML = `
                <p><strong>Date:</strong> ${latestDate}</p>
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

    // Event Listener and Calculation Logic
    document.getElementById('calculate-btn').addEventListener('click', function() {
        const selectedDateStr = document.getElementById('historical-date').value;
        const percentageIncreaseEl = document.getElementById('percentage-increase');
        const apyResultEl = document.getElementById('apy-result');
        const errorMessageCalcEl = document.getElementById('error-message-calc');

        // Clear previous results/errors
        percentageIncreaseEl.textContent = '';
        apyResultEl.textContent = '';
        errorMessageCalcEl.textContent = '';

        try {
            if (!fullTimeSeriesData) {
                errorMessageCalcEl.textContent = 'Historical data not yet loaded. Please wait for initial data to load.';
                return;
            }

            if (!selectedDateStr) {
                errorMessageCalcEl.textContent = 'Please select a date.';
                return;
            }

            const historicalData = fullTimeSeriesData[selectedDateStr];
            if (!historicalData) {
                errorMessageCalcEl.textContent = 'No data available for the selected date. It might be a weekend, a holiday, or too far in the past.';
                return;
            }
            const historicalClose = parseFloat(historicalData['4. close']);

            const dates = Object.keys(fullTimeSeriesData);
            const latestDateStr = dates[0];
            const latestClose = parseFloat(fullTimeSeriesData[latestDateStr]['4. close']);

            if (historicalClose <= 0) {
                errorMessageCalcEl.textContent = 'Historical closing price is zero or negative, cannot calculate growth.';
                return;
            }

            const date1 = new Date(selectedDateStr);
            const date2 = new Date(latestDateStr);

            if (date1 >= date2) {
                errorMessageCalcEl.textContent = 'Selected date must be before the latest trading day.';
                return;
            }

            const percentageIncrease = ((latestClose - historicalClose) / historicalClose) * 100;

            const timeDiffMillis = date2 - date1;
            const years = timeDiffMillis / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years

            if (years <= 0) { // Should be caught by date1 >= date2, but good as a safeguard
                errorMessageCalcEl.textContent = 'Time difference is too short for APY calculation (selected date must be in the past).';
                return;
            }

            const apy = (Math.pow(latestClose / historicalClose, 1 / years) - 1) * 100;

            percentageIncreaseEl.textContent = `Percentage Increase since ${selectedDateStr}: ${percentageIncrease.toFixed(2)}%`;
            apyResultEl.textContent = `Equivalent APY (compounded annually): ${apy.toFixed(2)}%`;

        } catch (error) {
            console.error('Error during calculation:', error);
            errorMessageCalcEl.textContent = `An unexpected error occurred: ${error.message}`;
        }
    });
});
