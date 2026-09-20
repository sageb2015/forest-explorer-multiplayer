# Forest Explorer Multiplayer Server

This is a small Node.js WebSocket room server for the Forest Explorer browser game.
It does not host the game files and does not touch the existing MarpolTrainingInstitute.com website.

## Render settings

Create a **Web Service** from this repository.

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Plan: Free for initial testing

The server listens on Render's `PORT` environment variable (default 10000).

## WebSocket endpoint

After Render gives the service its public URL, the game's browser client will connect to:

`wss://YOUR-SERVICE.onrender.com/ws`

Do not use `http://` or `ws://` from the HTTPS game site.

## Notes

- Rooms are in memory and disappear when the service restarts/spins down.
- Maximum 8 players per room.
- No database or persistent disk is required.
- `/health` can be opened in a browser to confirm the service is running.
- This server is intentionally separate from the existing cPanel site.
