document.addEventListener('DOMContentLoaded', function() {
    const stockDataElement = document.getElementById('stock-data');
    const apiKey = 'DEMO'; // Replace with your own Alpha Vantage API key if needed
    const symbol = 'AMZN';
    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;

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

            // Get the most recent trading day
            const timeSeries = data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error('Invalid API response: Time Series (Daily) data is missing.');
            }

            const dates = Object.keys(timeSeries);
            if (dates.length === 0) {
                throw new Error('Invalid API response: No dates found in time series.');
            }
            const latestDate = dates[0]; // Alpha Vantage returns data in reverse chronological order
            const latestData = timeSeries[latestDate];

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
});
