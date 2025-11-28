# Admin Authentication Setup

## Overview
The admin panel at `/admin` is now protected with environment-based password authentication.

## Local Development Setup

1. **Set the admin password** in `.dev.vars`:
   ```bash
   ADMIN_PASSWORD=your_secure_password_here
   ```

2. **Restart the dev server** to load the new environment variable:
   ```bash
   npx wrangler dev
   ```

3. **Access the admin panel** at `http://localhost:8788/admin` and use your password.

## Production Deployment

### Setting Environment Variables in Cloudflare

You have two options:

#### Option 1: Via Cloudflare Dashboard (Recommended)
1. Go to your Cloudflare dashboard
2. Navigate to **Workers & Pages** → Your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: Your secure password
   - **Environment**: Production (and/or Preview)
5. Click **Save**

#### Option 2: Via Wrangler CLI
```bash
npx wrangler secret put ADMIN_PASSWORD
# You'll be prompted to enter the password securely
```

### Deploy
```bash
npm run build
npx wrangler deploy
```

## Security Features

✅ **No hardcoded passwords** - Password stored in environment variables  
✅ **Backend verification** - Password checked on server, not client  
✅ **Token-based sessions** - Admin sessions use bearer tokens  
✅ **Protected endpoints** - All admin API routes require authentication  

## How It Works

1. User enters password on `/admin` login page
2. Frontend sends password to `/api/admin/auth`
3. Backend verifies against `ADMIN_PASSWORD` environment variable
4. On success, backend returns a token
5. Frontend stores token in localStorage
6. All subsequent admin API calls include the token in Authorization header
7. Backend validates token before processing requests

## Changing the Password

### Local Development
1. Update the password in `.dev.vars`
2. Restart `npx wrangler dev`

### Production
1. Update the environment variable in Cloudflare dashboard (or use `wrangler secret put`)
2. No redeployment needed - changes take effect immediately

## Troubleshooting

**"Server configuration error"**  
→ The `ADMIN_PASSWORD` environment variable is not set. Follow the setup steps above.

**"Unauthorized" errors**  
→ Your token may have expired or is invalid. Log out and log in again.

**Password not working after change**  
→ Make sure you restarted the dev server or updated the production environment variable.
