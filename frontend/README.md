# ResideFix frontend

React 19 + Vite single-page app. See the [main README](../README.md) for the full project.

```powershell
npm install
npm run dev      # http://localhost:5173 (proxies /api to http://localhost:5000)
npm run lint
npm test
npm run build    # production files in dist/
```

All API calls go through `src/services/api.js` and use the relative path `/api`, so the
same build works on `localhost` and from any PC on the lab network. In Docker, Nginx
(`nginx/default.conf`) serves the build and forwards `/api` to the backend container.
