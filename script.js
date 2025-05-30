document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const apiKey = 'DEMO'; // Replace with your own Alpha Vantage API key if needed
    const symbol = 'AMZN';
    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;

    let fullTimeSeriesData = null;

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
                throw new Error(`API Error: ${data['Error Message']}`);
            }
            if (data['Information']) {
                 throw new Error(`API Information: ${data['Information']}. The demo API key has limitations.`);
            }

            const timeSeries = data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: Time Series (Daily) data is missing.');
            }

            fullTimeSeriesData = timeSeries;

            const dates = Object.keys(fullTimeSeriesData);
            if (dates.length === 0) {
                throw new Error('Invalid API response: No dates found in time series.');
            }
            const latestDate = dates[0];
            const latestData = fullTimeSeriesData[latestDate];

            if (!latestData) {
                throw new Error(`No data found for ${latestDate}.`);
            }

            const open = parseFloat(latestData['1. open']).toFixed(2);
            const high = parseFloat(latestData['2. high']).toFixed(2);
            const low = parseFloat(latestData['3. low']).toFixed(2);
            const close = parseFloat(latestData['5. adjusted close']).toFixed(2);
            const volume = latestData['6. volume'];

            stockDataElement.innerHTML = `
                <p><strong>Date:</strong> ${latestDate}</p>
                <p><strong>Open:</strong> $${open}</p>
                <p><strong>High:</strong> $${high}</p>
                <p><strong>Low:</strong> $${low}</p>
                <p><strong>Adjusted Close:</strong> $${close}</p>
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
            if (!fullTimeSeriesData) {
                errorMessageCalcEl.textContent = 'Historical data not yet loaded. Please wait for initial data to load.';
                return;
            }

            if (!selectedDateStr) {
                errorMessageCalcEl.textContent = 'Please select a date.';
                return;
            }

            let actualHistoricalDateStr = selectedDateStr;
            let historicalData = fullTimeSeriesData[actualHistoricalDateStr];
            let attempts = 0;
            const maxAttempts = 7; // Look back up to 7 days

            while (!historicalData && attempts < maxAttempts) {
                errorMessageCalcEl.textContent = `No data for ${actualHistoricalDateStr}. Trying previous day...`; // Temporary message
                const currentDate = new Date(actualHistoricalDateStr);
                currentDate.setDate(currentDate.getDate() - 1);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                actualHistoricalDateStr = `${year}-${month}-${day}`;

                historicalData = fullTimeSeriesData[actualHistoricalDateStr];
                attempts++;
            }

            errorMessageCalcEl.textContent = ''; // Clear temporary messages

            if (!historicalData) {
                errorMessageCalcEl.textContent = `No data available for selected date ${selectedDateStr} or nearby prior trading days (up to ${maxAttempts} days).`;
                return;
            }

            const historicalClose = parseFloat(historicalData['5. adjusted close']);
            const dates = Object.keys(fullTimeSeriesData);
            const latestDateStr = dates[0];
            const latestClose = parseFloat(fullTimeSeriesData[latestDateStr]['5. adjusted close']);

            if (historicalClose <= 0) {
                errorMessageCalcEl.textContent = 'Historical adjusted closing price is zero or negative, cannot calculate growth.';
                return;
            }

            // Use actualHistoricalDateStr for date1, as this is the date whose data we are using
            const date1 = new Date(actualHistoricalDateStr);
            const date2 = new Date(latestDateStr);

            if (date1 >= date2) {
                // This check should now use actualHistoricalDateStr
                errorMessageCalcEl.textContent = `The found historical date (${actualHistoricalDateStr}) must be before the latest trading day (${latestDateStr}).`;
                return;
            }

            const percentageIncrease = ((latestClose - historicalClose) / historicalClose) * 100;
            const timeDiffMillis = date2 - date1;
            const years = timeDiffMillis / (1000 * 60 * 60 * 24 * 365.25);

            if (years <= 0) {
                errorMessageCalcEl.textContent = 'Time difference is too short for APY calculation.';
                return;
            }

            const apy = (Math.pow(latestClose / historicalClose, 1 / years) - 1) * 100;

            let dateNotice = '';
            if (selectedDateStr !== actualHistoricalDateStr) {
                dateNotice = ` (Data from ${actualHistoricalDateStr} as ${selectedDateStr} was a non-trading day or had no data)`;
            }
            // Display selectedDateStr as the primary reference, but provide the actual date used in the notice
            percentageIncreaseEl.textContent = `Percentage Increase since ${selectedDateStr}${dateNotice}: ${percentageIncrease.toFixed(2)}% (using data from ${actualHistoricalDateStr} to ${latestDateStr})`;
            apyResultEl.textContent = `Equivalent APY: ${apy.toFixed(2)}% (based on data from ${actualHistoricalDateStr} to ${latestDateStr})`;

        } catch (error) {
            console.error('Error during calculation:', error);
            errorMessageCalcEl.textContent = `An unexpected error occurred: ${error.message}`;
        }
    });
});
