# Deploying NERVE (AllHome edition)

The site needs three hosted pieces, all on free tiers:

| Piece | Host | Why |
|---|---|---|
| Database | **MongoDB Atlas** (M0, free) | Managed MongoDB |
| API | **Render** (Web Service, free) | A long-running Node server. Server-Sent Events, which stream agent progress to the browser, need connections that stay open, and serverless hosting doesn't allow that. |
| Frontend | **Vercel** | Static Vite build |

Setup takes about 15 minutes. Do the steps in order, because each one gives you a value the next step needs.

## 1. MongoDB Atlas
1. https://cloud.mongodb.com → **Create** a free **M0** cluster. Pick the Mumbai (`ap-south-1`) region.
2. **Database Access** → add a database user with a password.
3. **Network Access** → allow `0.0.0.0/0`. Render's free tier has no fixed IP address, so a narrower rule won't work.
4. **Connect → Drivers** → copy the connection string. It looks like `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`.

## 2. Render (API)
1. Push this repo to GitHub.
2. https://dashboard.render.com → **New → Blueprint** → choose the repo. Render reads `render.yaml`.
3. Fill in the values marked `sync: false`:
   - `MONGO_URI`: the Atlas string from step 1.
   - `GROQ_API_KEY`: your Groq key. It's optional: without it, the agents use their templates.
   - `CLIENT_URL`: leave it as a placeholder for now and set it after step 3.
   - `VERCEL_PROJECT_SLUG`: your Vercel project name, for example `nerve-allhome`.
4. Deploy, then check `https://<your-service>.onrender.com/api/health`. It should show `"status":"ok"`.

> On the free tier, Render puts the service to sleep after 15 idle minutes, and the first request then takes about 30 seconds while it wakes up. Open the health URL a minute before your demo. You can also add a free uptime monitor (for example UptimeRobot) that pings `/api/health` every 10 minutes.

## 3. Vercel (frontend)
```bash
cd client
vercel login
vercel --prod
```
When the CLI asks, use root directory `client`, framework **Vite**, build command `npm run build` and output directory `dist`.
Then go to **Project → Settings → Environment Variables** and add:
- `VITE_API_URL` = `https://<your-service>.onrender.com/api`

Redeploy with `vercel --prod`.

## 4. Connect the two
In Render, set `CLIENT_URL` to your Vercel URL (for example `https://nerve-allhome.vercel.app`). Render restarts the service automatically.

## 5. Check it works
1. Open the Vercel URL and click **Continue as AllHome demo**. You should land on the dashboard with 8 missions and the tour.
2. Open any mission → **Learn** phase → type *"Can we visit your showroom to see samples?"* → a visit should be booked → click **Push to Zoho**.
3. **New Mission** → launch a lead. The phases should stream live, with the "Live" badge green.

## Environment reference
See `server/.env.example` for every server variable. The client only uses `VITE_API_URL`.
