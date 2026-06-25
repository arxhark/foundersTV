# FoundersTV — Setup Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google Cloud Console project (for OAuth)
- Cloudinary account (free tier works)

## 1. Google OAuth Setup
1. Go to console.cloud.google.com
2. Create a new project → "APIs & Services" → "OAuth consent screen"
3. Add scope: email, profile
4. Create credentials → OAuth 2.0 Client ID (Web application)
5. Add Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret

## 2. MongoDB Atlas Setup
1. Create a free cluster at mongodb.com/atlas
2. Create a database user with read/write access
3. Allow network access from anywhere (0.0.0.0/0) for dev
4. Copy the connection string (replace <password> with your password)

## 3. Cloudinary Setup
1. Sign up at cloudinary.com
2. Copy Cloud Name, API Key, API Secret from the dashboard

## 4. Environment Variables

### server/.env
```
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/founderstv
JWT_SECRET=generate_a_random_32_char_string_here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### client/.env
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 5. Run the app

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open http://localhost:5173

## Production Deployment

### Backend → Railway
1. Push to GitHub
2. New project in Railway → Deploy from GitHub
3. Add all env variables
4. Set `SERVER_URL` to your Railway domain

### Frontend → Vercel
1. Import GitHub repo
2. Set root directory to `client`
3. Set `VITE_API_URL` and `VITE_SOCKET_URL` to your Railway URL
4. Update `CLIENT_URL` in Railway env to your Vercel domain

### Google OAuth for production
- Add your Railway URL to authorized redirect URIs
- Add your Vercel domain to authorized JavaScript origins
