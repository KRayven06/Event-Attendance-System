// Scanner.js (clean version without ugly default UI)

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

// --- NEW CUSTOM SCANNER SETUP ---
let html5Qrcode;

async function startScanner() {
    html5Qrcode = new Html5Qrcode("qr-reader");

    const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 }, // bigger scan area
        videoConstraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        await html5Qrcode.start(
            { facingMode: "environment" }, // back camera on mobile
            config,
            onScanSuccess,
            onScanFailure
        );
        resultMessageEl.textContent = "Please scan a QR code...";
    } catch (err) {
        resultMessageEl.textContent = "Camera start failed: " + err;
    }
}

// Auto start scanner on page load
startScanner();

// --- Attendance Marking Function ---
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
