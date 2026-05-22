const statusBtn = document.getElementById('statusBtn');
const statusOutput = document.getElementById('statusOutput');

statusBtn.addEventListener('click', async () => {
  statusOutput.textContent = 'Checking API status...';

  try {
    const response = await fetch('/api/status');
    const payload = await response.json();
    statusOutput.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    statusOutput.textContent = 'Unable to reach the API. Please make sure the server is running.';
  }
});
