document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const apiKey = 'DEMO'; // Alpha Vantage DEMO key
    const symbol = 'AMZN';
    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;

    let fullTimeSeriesData = {}; // Initialize as an empty object, will be assigned Alpha Vantage's timeSeries object

    stockDataElement.innerHTML = '<p>Fetching latest stock data for AMZN...</p>';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                // Attempt to parse JSON error from Alpha Vantage if possible
                return response.json().then(errData => {
                    // Alpha Vantage often includes error details in the JSON body even for non-200 responses
                    const apiErrorMessage = errData['Error Message'] || errData['Information'] || JSON.stringify(errData);
                    throw new Error(`HTTP error! status: ${response.status}. API Message: ${apiErrorMessage}`);
                }).catch(() => {
                    // Fallback if the error response isn't JSON
                    throw new Error(`HTTP error! status: ${response.status}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Alpha Vantage specific error checking
            if (data['Error Message']) {
                throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
            }
            // Alpha Vantage rate limit messages are often in 'Information'
            if (data['Information']) {
                stockDataElement.innerHTML = `<p class="error">API Information: ${data['Information']}</p>`;
                // Throw an error to stop further processing and log it, as it's not usable data
                throw new Error(`Alpha Vantage API Information: ${data['Information']}`);
            }

            const timeSeries = data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: "Time Series (Daily)" data is missing from Alpha Vantage response.');
            }

            fullTimeSeriesData = timeSeries; // Assign Alpha Vantage's time series object directly

            const dates = Object.keys(timeSeries);
            if (dates.length === 0) {
                throw new Error('No dates found in Alpha Vantage time series.');
            }
            dates.sort((a, b) => b.localeCompare(a)); // Sort dates descending, newest first
            const latestDateStr_display = dates[0];
            const latestData_display = timeSeries[latestDateStr_display];

            if (!latestData_display) {
                throw new Error(`No data found for the latest date (${latestDateStr_display}) for display.`);
            }

            // Extract data using Alpha Vantage field names
            const displayDate = latestDateStr_display; // Date is the key itself
            const open = parseFloat(latestData_display['1. open']).toFixed(2);
            const high = parseFloat(latestData_display['2. high']).toFixed(2);
            const low = parseFloat(latestData_display['3. low']).toFixed(2);
            const adjustedClose = parseFloat(latestData_display['5. adjusted close']).toFixed(2);
            const volume = latestData_display['6. volume'];

            stockDataElement.innerHTML = `
                <p><strong>Date:</strong> ${displayDate}</p>
                <p><strong>Open:</strong> $${open}</p>
                <p><strong>High:</strong> $${high}</p>
                <p><strong>Low:</strong> $${low}</p>
                <p><strong>Adjusted Close:</strong> $${adjustedClose}</p> 
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
            let historicalData = fullTimeSeriesData[actualHistoricalDateStr]; // AV data is directly keyed by date
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

            // Use Alpha Vantage field name '5. adjusted close'
            const historicalClose = parseFloat(historicalData['5. adjusted close']); 

            const allDates = Object.keys(fullTimeSeriesData);
            if (allDates.length === 0) { 
                 errorMessageCalcEl.textContent = 'No dates available in processed historical data.';
                 return;
            }
            allDates.sort((a, b) => b.localeCompare(a)); 
            const latestDateStr_calc = allDates[0]; // latestDateStr for calculation
            
            const latestDataForCalc = fullTimeSeriesData[latestDateStr_calc];
            if (!latestDataForCalc) {
                 errorMessageCalcEl.textContent = `Missing data for the determined latest date: ${latestDateStr_calc}`;
                 return;
            }
            // Use Alpha Vantage field name '5. adjusted close'
            const latestClose = parseFloat(latestDataForCalc['5. adjusted close']);

            if (historicalClose <= 0) {
                errorMessageCalcEl.textContent = 'Historical adjusted closing price is zero or negative.';
                return;
            }
            
            const date1 = new Date(actualHistoricalDateStr); 
            const date2 = new Date(latestDateStr_calc);

            if (date1 >= date2) {
                errorMessageCalcEl.textContent = `Found historical date (${actualHistoricalDateStr}) must be before latest day (${latestDateStr_calc}).`;
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
            // Labels confirm that adjusted close prices are used.
            percentageIncreaseEl.textContent = `Increase (Adjusted Close) since ${selectedDateStr}${dateNotice}: ${percentageIncrease.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr_calc})`;
            apyResultEl.textContent = `Equivalent APY (Adjusted Close): ${apy.toFixed(2)}% (from ${actualHistoricalDateStr} to ${latestDateStr_calc})`;

        } catch (error) {
            console.error('Error during calculation:', error);
            errorMessageCalcEl.textContent = `An unexpected error occurred: ${error.message}.`;
        }
    });
});
