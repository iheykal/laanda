# 🔄 How to Properly Restart Backend Server

## Problem: Backend Running Old Code

If you see "Email and password are required" instead of "Phone and password are required", 
the backend server is running old code.

---

## ✅ Solution 1: Kill All Node Processes (Recommended)

### Windows:
```bash
# Open Command Prompt or PowerShell as Administrator
taskkill /F /IM node.exe

# Then restart
cd C:\Users\ILYAAS ABDIRAHMAN\Desktop\laanda\mern-ludo\backend
npm start
```

---

## ✅ Solution 2: Close Terminal and Restart

1. Close the terminal window where backend is running
2. Open a NEW terminal
3. Navigate to backend folder:
   ```bash
   cd C:\Users\ILYAAS ABDIRAHMAN\Desktop\laanda\mern-ludo\backend
   ```
4. Start server:
   ```bash
   npm start
   ```

---

## ✅ Solution 3: Use Task Manager (Windows)

1. Press Ctrl + Shift + Esc to open Task Manager
2. Find all "Node.js" processes
3. Right-click each one → End Task
4. Then start backend:
   ```bash
   cd backend
   npm start
   ```

---

## 🔍 Verify Backend is Running New Code

After restarting, try to login. You should see in the backend terminal:

```
Login attempt received: { phone: '610251014', hasPassword: true }
Looking for user with phone: 610251014
User found: SuperAdmin
Password match: true
Login successful for: SuperAdmin
```

If you DON'T see these logs, the server is still using old code.

---

## 🚀 Install Nodemon (Auto-restart on changes)

To avoid this issue in future, install nodemon:

```bash
cd backend
npm install nodemon --save-dev
```

Then update `backend/package.json`:
```json
{
  "scripts": {
    "start": "nodemon server.js",
    "test": "mocha tests/**/*.js"
  }
}
```

Now the server will automatically restart when you change files!

---

## ❓ Still Not Working?

Check if the port is already in use:

```bash
# Windows - Check what's running on port 3000
netstat -ano | findstr :3000

# Kill the process using the PID shown
taskkill /F /PID <PID_NUMBER>
```

Then restart the backend.

