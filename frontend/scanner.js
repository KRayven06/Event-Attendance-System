// This is the corrected version without the 'DOMContentLoaded' wrapper.

const resultMessageEl = document.getElementById('result-message');
let lastScanTime = 0;
const scanCooldown = 3000;

function onScanSuccess(decodedText, decodedResult) {
    const currentTime = Date.now();
    if (currentTime - lastScanTime < scanCooldown) {
        return;
    }
    lastScanTime = currentTime;
    markAttendance(decodedText);
}

function onScanFailure(error) {
    // Ignore scan failures to allow for continuous scanning.
}

// Configuration with higher resolution video constraints
const scannerConfig = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};

let html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", 
    scannerConfig,
    /* verbose= */ false);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);

async function markAttendance(registration_id) {
    resultMessageEl.textContent = 'Verifying...';
    resultMessageEl.parentElement.className = 'scan-result';

    try {
        const response = await fetch('/mark-attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id }),
        });
        const result = await response.json();

        if (response.ok) {
            resultMessageEl.textContent = `Welcome, ${result.participant.name}! Attendance marked.`;
            resultMessageEl.parentElement.classList.add('success');
        } else {
            let errorMessage = `Error: ${result.error}`;
            if (result.participant) {
                errorMessage += ` (${result.participant.name})`;
            }
            resultMessageEl.textContent = errorMessage;
            resultMessageEl.parentElement.classList.add('error');
        }
    } catch (error) {
        resultMessageEl.textContent = 'A network error occurred.';
        resultMessageEl.parentElement.classList.add('error');
    }
}