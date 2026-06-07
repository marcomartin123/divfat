<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1qWRf4zO-m-6jtWxZfMroMIUnOHntWiZO

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy the environment template:
   `cp .env.example .env.local`
3. Set `GEMINI_API_KEY` in `.env.local` to process PDFs with Gemini
4. Run the app:
   `npm run dev`

## Cloudflare migration target

This app is being prepared for Cloudflare Pages + Workers + D1 + R2.

- Pages will host the React frontend.
- Workers will handle API calls and secrets such as `GEMINI_API_KEY`.
- D1 will store structured data.
- R2 will store PDFs, proof files, and exported backups.
