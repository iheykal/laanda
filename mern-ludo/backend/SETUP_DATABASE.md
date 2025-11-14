# 🗄️ Database Setup Guide

## You Need to Create a `.env` File!

The error you're seeing is because there's no database connection configured.

---

## ✅ EASIEST OPTION: MongoDB Atlas (FREE Cloud Database)

### Step 1: Create MongoDB Atlas Account (2 minutes)

1. Go to: **https://www.mongodb.com/cloud/atlas/register**
2. Sign up for FREE
3. Choose: **FREE M0 Cluster**
4. Select a cloud provider (AWS is fine)
5. Choose a region close to Somalia (Europe or Middle East)
6. Click **Create Cluster** (takes 3-5 minutes)

### Step 2: Create Database User

1. In Atlas Dashboard, click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `ludoadmin`
5. Password: `YourStrongPassword123` (remember this!)
6. Database User Privileges: **Read and write to any database**
7. Click **Add User**

### Step 3: Allow Network Access

1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
4. Click **Confirm**

### Step 4: Get Connection String

1. Go back to **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://ludoadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Create .env File

**Create a new file** in your `backend` folder named exactly: `.env`

**Paste this content** (replace with your details):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://ludoadmin:YourStrongPassword123@cluster0.xxxxx.mongodb.net/ludo-game?retryWrites=true&w=majority
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8
```

**IMPORTANT CHANGES TO MAKE:**
- Replace `YourStrongPassword123` with your actual MongoDB password
- Replace `cluster0.xxxxx` with your actual cluster address from the connection string
- Keep everything else the same!

---

## 🖥️ ALTERNATIVE: Local MongoDB (If you have it installed)

If you already have MongoDB installed on your computer:

### Create .env file:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ludo-game
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8
```

### Then start MongoDB:
```bash
# Windows
net start MongoDB

# Or run mongod
mongod
```

---

## 📝 After Creating .env File

Run the superadmin script again:

```bash
node scripts/createSuperAdmin.js
```

You should see:
```
✅ MongoDB connected
✅ Super admin created successfully!

📱 Super Admin Credentials:
   Phone: 610251014
   Password: ilyaasadmin
```

---

## ❓ Need Help?

### Error: "Cannot find module .env"
- Make sure the file is named exactly `.env` (with the dot!)
- It should be in the `backend` folder
- No file extension (.txt, etc.)

### Error: "Authentication failed"
- Check your MongoDB username and password in .env
- Make sure you copied them correctly from Atlas

### Error: "Network timeout"
- Check you allowed "Access from Anywhere" in Atlas Network Access
- Check your internet connection

---

## 🎯 Next Steps After .env is Created:

1. Run: `node scripts/createSuperAdmin.js`
2. Start backend: `npm start`
3. Start frontend: `npm start` (in main folder)
4. Login at: `http://localhost:3000/auth/login`

Your credentials:
- Phone: **610251014**
- Password: **ilyaasadmin**

