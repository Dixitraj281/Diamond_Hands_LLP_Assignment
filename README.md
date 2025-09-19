# Stocky Assignment

this is a small project to manage rewarding users with stock shares and see portfolio. build with node + express + mongodb in backend and react + vite in frontend. 

## setup

- clone repo
- install dep both backend and frontend (`npm install`)
- create `.env` file in backend with your mongo uri and any api keys
- run backend: `npm run dev`
- run frontend: `npm run dev`

## features

- admin can create user and reward them stocks from dropdown
- user portal show portfolio, todays rewards, stats and history in INR
- stock prices fetched live from yahoo page (simple web scraping)
- reward saving also writes to ledger for tracking shares and cash flow

