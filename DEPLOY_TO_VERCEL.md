# Deploying to Vercel with Vercel Postgres

Yes! You can host your database directly on Vercel using **Vercel Postgres**. This is the easiest way to deploy.

## Steps to Deploy

1.  **Push your code to GitHub**

    ```bash
    git add .
    git commit -m "Ready for Vercel deployment"
    git push
    ```

2.  **Create Project on Vercel**

    - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** -> **"Project"**.
    - Import your `event-attendance-system` repository.
    - **Don't deploy yet.** (Or if you do, it might fail initially, which is fine).

3.  **Add a Database (Vercel Postgres)**

    - On your Vercel Project page, click the **Storage** tab.
    - Click **"Create Database"** -> Select **"Postgres"**.
    - Accept the terms and create the database.
    - When asked to **"Connect Project"**, select your `event-attendance-system` project.
    - **Important:** This automatically sets the environment variables (like `POSTGRES_URL`) for your project.

4.  **Final Deploy**
    - Go to the **Deployments** tab.
    - If your previous deployment failed, click **Redeploy**.
    - Your app will now automatically connect to the new Vercel Postgres database!

## How it works

I have updated `backend/server.js` to automatically look for the `POSTGRES_URL` environment variable that Vercel provides. You don't need to copy/paste any connection strings manually!
