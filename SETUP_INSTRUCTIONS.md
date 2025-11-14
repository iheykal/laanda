# 🚀 Security Setup Instructions

## Quick Start - Security Configuration

Follow these steps **IN ORDER** to secure your application before deployment.

---

## Step 1: Install Required Dependencies

```bash
cd backend
npm install express-rate-limit
```

Or if you need to install all dependencies:
```bash
npm install express mongoose bcryptjs jsonwebtoken express-rate-limit dotenv cors
```

---

## Step 2: Configure Environment Variables

### Generate JWT Secret

Run this command to generate a secure random secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Create .env File

Copy the example file and edit it:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add:
```env
JWT_SECRET=<paste_the_generated_secret_here>
MONGODB_URI=mongodb://localhost:27017/ludo-game
PORT=5000
ADMIN_EMAIL=your-email@example.com
```

---

## Step 3: Verify Security Settings

### Check AUTH Middleware

Open `backend/middleware/auth.js` and verify:
```javascript
const TEST_MODE = false; // ✅ MUST be false
```

### Check MERN-LUDO AUTH Middleware

Open `mern-ludo/backend/middleware/auth.js` and verify:
```javascript
const TEST_MODE = false; // ✅ MUST be false
```

---

## Step 4: Test the Application

### Start Backend Server
```bash
cd backend
node server.js
```

You should see:
```
🔴 CRITICAL: JWT_SECRET is not set in environment variables!
Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

If you see this warning, your JWT_SECRET is not properly set in `.env`.

### Verify No Errors

The server should start without errors. Check for:
- ✅ MongoDB connection successful
- ✅ Server listening on port 5000
- ✅ No "TEST_MODE" warnings (unless you see the TEST_MODE is false)

---

## Step 5: Create Admin Account

### 1. Register a New User

Use the API or frontend to register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "phone": "1234567890",
    "password": "YourSecurePassword123!"
  }'
```

### 2. Make User Admin

Connect to MongoDB and update the user:
```javascript
// MongoDB Shell
use ludo-game

db.users.updateOne(
  { username: "admin" },
  { $set: { isAdmin: true, isSuperAdmin: true } }
)
```

Or using MongoDB Compass/Atlas, find your user and set:
- `isAdmin: true`
- `isSuperAdmin: true`

---

## Step 6: Security Verification Checklist

Run through this checklist:

### Environment
- [ ] `.env` file created with strong JWT_SECRET
- [ ] `.env` file added to `.gitignore`
- [ ] MongoDB connection string configured
- [ ] No default passwords used

### Code
- [ ] TEST_MODE = false in `backend/middleware/auth.js`
- [ ] TEST_MODE = false in `mern-ludo/backend/middleware/auth.js`
- [ ] Rate limiting middleware installed
- [ ] Audit logging models created

### Database
- [ ] MongoDB authentication enabled
- [ ] Strong database password
- [ ] Admin account created
- [ ] Admin privileges set correctly

### Testing
- [ ] Can register new users
- [ ] Can login successfully
- [ ] Cannot access admin routes without admin privileges
- [ ] Rate limiting works (try 11+ login attempts rapidly)
- [ ] Deposits require admin approval
- [ ] Withdrawals require admin approval

---

## Step 7: Deploy to Production

### Additional Production Steps:

1. **HTTPS/SSL Certificate**
   - Install SSL certificate on your server
   - Configure HTTPS in your Express app
   - Force redirect HTTP to HTTPS

2. **Environment-Specific Settings**
   ```env
   NODE_ENV=production
   FRONTEND_URL=https://yourdomain.com
   ```

3. **MongoDB Atlas** (Recommended)
   - Create MongoDB Atlas cluster
   - Whitelist your server IP
   - Use connection string with authentication
   - Enable backup

4. **Server Hardening**
   - Install and configure firewall
   - Disable unused ports
   - Keep system updated
   - Configure automatic security updates

5. **Monitoring**
   - Set up error monitoring (e.g., Sentry)
   - Configure log aggregation
   - Set up uptime monitoring
   - Enable alerts for suspicious activity

---

## Common Issues & Solutions

### Issue: "JWT_SECRET is not set" error
**Solution:** 
1. Check if `.env` file exists in `backend/` directory
2. Verify JWT_SECRET line has no typos
3. Restart the server after editing `.env`

### Issue: "Cannot find module 'express-rate-limit'"
**Solution:**
```bash
cd backend
npm install express-rate-limit
```

### Issue: "Cannot connect to MongoDB"
**Solution:**
1. Check if MongoDB is running: `mongod --version`
2. Verify MONGODB_URI in `.env`
3. For local MongoDB, start service: `sudo service mongodb start`

### Issue: "Authentication failed" on all requests
**Solution:**
1. Check if TEST_MODE is false
2. Verify you're sending Authorization header: `Bearer <token>`
3. Check if token is expired (30-day expiry)
4. Try logging in again to get new token

### Issue: Rate limiting too strict
**Solution:**
Edit `backend/middleware/rateLimiter.js` and adjust limits:
```javascript
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Increase this number
    // ...
});
```

---

## Testing Security

### Test Rate Limiting
```bash
# Try to login 11 times rapidly (should be blocked on 11th attempt)
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"1234567890","password":"wrong"}' &
done
wait
```

### Test Authentication
```bash
# Try to access protected route without token (should fail)
curl http://localhost:5000/api/auth/balance

# Login and try with token (should succeed)
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","password":"YourPassword"}' \
  | jq -r '.token')

curl http://localhost:5000/api/auth/balance \
  -H "Authorization: Bearer $TOKEN"
```

### Check Audit Logs
```javascript
// MongoDB Shell
db.auditlogs.find().sort({ createdAt: -1 }).limit(10).pretty()
```

---

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Test all functionality
3. ✅ Review `SECURITY_GUIDE.md` for best practices
4. ✅ Set up monitoring and alerts
5. ✅ Create backup strategy
6. ✅ Document any custom configurations
7. ✅ Train team on security procedures

---

## Support & Resources

- **Security Guide:** `SECURITY_GUIDE.md`
- **Wallet System Guide:** `WALLET_SYSTEM_GUIDE.md`
- **API Documentation:** (Create if needed)
- **Admin Panel Guide:** (Create if needed)

---

**Remember:** Security is an ongoing process, not a one-time setup. Regularly review logs, update dependencies, and stay informed about new security threats.

**Last Updated:** 2025-11-11  
**Version:** 1.0

