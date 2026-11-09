# ResideFix frontend

React 19 + Vite single-page app for ResideFix.

```powershell
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

The API address comes from `src/api.js` (`http://localhost:5000/api` by default).
Set `VITE_API_URL` to point at a different backend.

Pages: `Home`, `Login`, `Signup`, and `Dashboard` (residents report and manage their
own complaints; managers see all complaints and update their status).

See the [main README](../README.md) for the full project and Docker setup.
