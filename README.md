# Event Attendance & Registration System

This is a complete system for managing event registrations and marking attendance using QR codes. It includes a user-facing registration form, a QR code scanner, and an admin dashboard for live tracking and data export.

## Features

-   **User Registration**: Simple form to collect Name and Email.
-   **Unique QR Code Generation**: Each registration generates a unique QR code containing a registration ID.
-   **QR Code Attendance Scanner**: A web-based scanner to mark participants as 'Attended'.
-   **Prevents Duplicate Scans**: The system will not allow the same person to be marked as 'Attended' more than once.
-   **Admin Dashboard**: A live-updating table showing the status of all registered participants.
-   **Export to Excel**: Download the complete attendance report as an `.xlsx` file from the admin dashboard.

## Technology Stack

-   **Frontend**: HTML, CSS, JavaScript (with `qrcode.js` and `html5-qrcode` libraries)
-   **Backend**: Node.js with Express.js
-   **Database**: SQLite (file-based, no separate server needed)
-   **Excel Export**: `xlsx` library

## How to Run the Application

Follow these steps to get the application running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (which includes npm) installed on your computer.

### Steps

1.  **Create the Files**:
    Create all the folders and files as described and copy the code into them.

2.  **Navigate to the Backend Directory**:
    Open your terminal or command prompt and change your directory to the `backend` folder.
    ```bash
    cd path/to/your/project/backend
    ```

3.  **Install Dependencies**:
    Run the following command to install all the necessary backend packages defined in `package.json`.
    ```bash
    npm install
    ```
    This will create a `node_modules` folder and a `database.db` file inside the `backend` directory.

4.  **Start the Server**:
    Once the installation is complete, start the server with this command:
    ```bash
    node server.js
    ```
    You should see a message in your terminal confirming that the server is running:
    ```
    Connected to the SQLite database.
    Server running at http://localhost:3000
    ```

5.  **Access the Application**:
    Open your web browser and navigate to the following URLs:

    -   **Registration Page**: `http://localhost:3000`
    -   **QR Scanner Page**: `http://localhost:3000/scan`
    -   **Admin Dashboard**: `http://localhost:3000/admin`

## How to Use

1.  **Register a Participant**: Go to the registration page, fill in the details, and click "Register". A QR code will be generated. Save it (e.g., take a screenshot).
2.  **Mark Attendance**: Go to the scanner page. Allow the browser to access your camera. Scan the QR code you saved. You'll see a confirmation message.
3.  **View Live Data**: Go to the admin dashboard to see the participant's status change to "Attended" in real-time.
4.  **Export Report**: On the admin dashboard, click the "Download Excel Report" button to get the attendance sheet.