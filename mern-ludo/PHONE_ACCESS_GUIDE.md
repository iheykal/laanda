# 📱 Access Ludo Game From Your Phone

## Your PC's Local IP Address
**192.168.100.32**

---

## 🚀 Quick Setup Steps

### 1. **Restart Both Servers**

**Backend (Terminal 1):**
```powershell
cd C:\Users\ILYAAS ABDIRAHMAN\Desktop\laanda\mern-ludo\backend
node server.js
```

**Frontend (Terminal 2):**
```powershell
cd C:\Users\ILYAAS ABDIRAHMAN\Desktop\laanda\mern-ludo
npm start
```

---

### 2. **Access From Your Phone**

Make sure your phone is connected to the **SAME WiFi** as your PC.

**Open your phone's browser and go to:**
```
http://192.168.100.32:3000
```

---

## 🎮 How To Test Multiplayer

### **Option 1: Phone vs PC**
1. **PC Browser:** `http://localhost:3000` or `http://192.168.100.32:3000`
2. **Phone Browser:** `http://192.168.100.32:3000`
3. One creates room, other joins

### **Option 2: Two Phones**
1. **Phone 1:** `http://192.168.100.32:3000`
2. **Phone 2:** `http://192.168.100.32:3000`
3. Both connected to same WiFi

---

## ⚠️ Troubleshooting

### **Can't Access From Phone?**

**1. Check Windows Firewall:**
```powershell
# Run this in PowerShell as Administrator:
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

**2. Make Sure Both Devices on Same WiFi:**
- PC WiFi: Should be your home network
- Phone WiFi: Must be SAME network

**3. Try Disabling Windows Firewall Temporarily:**
- Windows Settings → Update & Security → Windows Security
- Firewall & network protection → Turn off (just for testing)

**4. Check if Backend is Running:**
Open phone browser: `http://192.168.100.32:3000`
Should see backend response or connection

---

## 📊 What You Should See

### **PC Terminal (Backend):**
```
🚀 Backend server running on port 3000
📱 Access from phone: http://192.168.100.32:3000
MongoDB Connected…
```

### **PC Terminal (Frontend):**
```
Compiled successfully!

You can now view mern-ludo in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.100.32:3000
```

### **Phone Browser:**
- Should see the Ludo login page
- Can create/join rooms
- Play with PC player or other phone

---

## 🎯 Your URLs

| Device | Frontend URL | Backend URL |
|--------|-------------|-------------|
| PC     | http://localhost:3000 | http://localhost:3000 |
| Phone  | http://192.168.100.32:3000 | http://192.168.100.32:3000 |
| Any Device on Same WiFi | http://192.168.100.32:3000 | http://192.168.100.32:3000 |

---

## 🔒 Security Note

These settings allow any device on your local network to access the game.
This is **safe for testing** on your home WiFi.

For production deployment, you'll need proper security measures.

---

## ✅ Success Checklist

- [ ] Backend running (Terminal 1)
- [ ] Frontend running (Terminal 2)  
- [ ] Phone connected to same WiFi as PC
- [ ] Can open `http://192.168.100.32:3000` in phone browser
- [ ] Game loads on phone
- [ ] Can create/join rooms from phone
- [ ] Can play between PC and phone

---

**Happy Gaming! 🎲🎮**

