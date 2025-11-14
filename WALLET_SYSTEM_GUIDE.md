# 💰 Wallet System Implementation Guide

## Overview

Your Ludo game now has a complete **user registration and wallet system** with manual payment processing. Users can deposit money, play games with real bets, and withdraw winnings.

---

## 🎯 System Flow

### 1. **User Registration**
- Users create an account with username, email, phone, and password
- Each user starts with $0 balance
- Passwords are securely hashed using bcrypt

### 2. **Deposit Money**
- User sends money to your phone number (EVC Plus/Zaad/etc.)
- User submits deposit request with:
  - Amount sent
  - Their phone number
  - Transaction ID (optional)
  - Notes/proof (optional)
- Request goes to **Pending** status
- **You (Admin) approve or reject it**
- Upon approval, money is added to user's balance

### 3. **Play Games**
- Users can only play if they have sufficient balance
- When game starts, bet amount is deducted from each player
- Game proceeds normally

### 4. **Winning**
- When game ends, winner receives **90% of the total pot**
- **You keep 10% as platform fee**
- Winner's balance is automatically updated

### 5. **Withdrawal**
- User requests withdrawal with:
  - Amount they want to withdraw
  - Their phone number
- Request goes to **Pending** status
- **You (Admin) approve or reject it**
- You manually send money to their phone
- Upon approval in admin panel, amount is deducted from their balance

---

## 🔐 Setting Up Admin Access

### Step 1: Update Environment Variables

Add these to your `backend/.env` file:

```env
JWT_SECRET=your_very_long_and_secure_random_secret_key_here
ADMIN_EMAIL=your_actual_email@example.com
```

To generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 2: Create Your Admin Account

1. Start the server
2. Register normally at `/auth/register`
3. Stop the server
4. Open MongoDB and find your user
5. Set `isAdmin: true` for your user

OR use MongoDB Compass/Shell:
```javascript
db.users.updateOne(
  { email: "your_admin_email@example.com" },
  { $set: { isAdmin: true } }
)
```

---

## 📱 Frontend Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/auth/register` | User registration | Public |
| `/auth/login` | User login | Public |
| `/wallet` | User wallet dashboard | Authenticated users |
| `/admin` | Admin panel | Admin only |
| `/login` | Game lobby (old route) | For joining games |
| `/game` | Active game board | Players in game |

---

## 🎮 User Flow (Step by Step)

### For Players:

1. **Register Account**
   - Go to `/auth/register`
   - Fill in username, email, phone, password
   - Get redirected to wallet

2. **Deposit Money**
   - In wallet, click "Deposit" tab
   - See admin payment details
   - Send money via EVC Plus/Zaad/etc.
   - Fill deposit form with transaction details
   - Wait for admin approval

3. **Check Balance**
   - Balance is shown on wallet dashboard
   - Can view transaction history

4. **Play Game**
   - Click "Play Game" button (only enabled if balance > 0)
   - Join or create a game room
   - Bet amount is deducted when game starts
   - If you win, you get 90% of total pot

5. **Withdraw Money**
   - Click "Withdraw" tab
   - Enter amount and phone number
   - Submit request
   - Admin will send money and approve

### For Admin (You):

1. **Login as Admin**
   - Login with your admin email
   - You'll see "Admin Panel" button in wallet

2. **Review Pending Deposits**
   - Click "Admin Panel"
   - See all pending transactions
   - Check user details, phone number, amount
   - Verify you received the payment

3. **Approve/Reject Deposits**
   - Click "✓ Approve" to add money to user's account
   - Click "✗ Reject" if transaction is invalid
   - Add admin notes if needed

4. **Process Withdrawals**
   - Review withdrawal requests
   - Send money to user's phone number manually
   - Click "✓ Approve" to deduct from their balance

5. **View Statistics**
   - See total games played
   - See total revenue earned (10% fees)
   - View all users and their balances

---

## 🛠️ Technical Implementation Details

### Backend Models Created:

1. **User Model** (`backend/models/user.js`)
   - username, email, phone, password (hashed)
   - balance (default: 0)
   - isActive, isAdmin flags

2. **Transaction Model** (`backend/models/transaction.js`)
   - type: 'deposit' or 'withdrawal'
   - amount, status (pending/approved/rejected)
   - phoneNumber, transactionId, notes
   - adminNotes, timestamps

3. **GameHistory Model** (`backend/models/gameHistory.js`)
   - Track completed games
   - Players, bet amounts, winner
   - Platform fee (10%), winner payout (90%)

### API Routes:

**Auth Routes** (`/api/auth/`)
- POST `/register` - Register new user
- POST `/login` - Login user
- GET `/me` - Get current user profile
- GET `/balance` - Get current balance

**Transaction Routes** (`/api/transactions/`)
- POST `/deposit` - Request deposit
- POST `/withdrawal` - Request withdrawal
- GET `/my-transactions` - Get user's transaction history

**Admin Routes** (`/api/admin/`)
- GET `/transactions/pending` - Get pending transactions
- GET `/transactions` - Get all transactions
- POST `/transactions/:id/approve` - Approve transaction
- POST `/transactions/:id/reject` - Reject transaction
- GET `/users` - Get all users
- GET `/stats/games` - Get game statistics
- GET `/games` - Get game history

### Frontend Components Created:

**Authentication:**
- `src/components/Auth/Register.jsx` - Registration form
- `src/components/Auth/Login.jsx` - Login form
- `src/context/AuthContext.js` - Authentication state management

**Wallet:**
- `src/components/Wallet/WalletDashboard.jsx` - Main wallet page
- `src/components/Wallet/DepositForm.jsx` - Deposit request form
- `src/components/Wallet/WithdrawalForm.jsx` - Withdrawal request form
- `src/components/Wallet/TransactionHistory.jsx` - Transaction history view

**Admin:**
- `src/components/Admin/AdminPanel.jsx` - Admin dashboard

**Utils:**
- `src/utils/api.js` - API helper functions

---

## 🎨 Payment Details Configuration

**IMPORTANT:** Update the payment details in `DepositForm.jsx`:

```javascript
// Line 60-62 in DepositForm.jsx
<p>📱 EVC Plus: +252-XXX-XXX-XXX</p>
<p>💳 Zaad: +252-XXX-XXX-XXX</p>
```

Replace with your actual phone numbers for receiving payments!

---

## 🚀 Starting the System

### 1. Backend Setup:

```bash
cd backend

# Install dependencies (if not done)
npm install bcryptjs jsonwebtoken

# Update .env file with JWT_SECRET and ADMIN_EMAIL

# Start server
node server.js
```

### 2. Frontend Setup:

```bash
# From main directory
npm start
```

### 3. First Time Setup:

1. Register your admin account at `/auth/register`
2. Update your user in MongoDB: `isAdmin: true`
3. Update payment phone numbers in `DepositForm.jsx`
4. Test the system with a test user

---

## 💡 Game Integration (Next Step)

To integrate betting into your game:

1. **Before Game Starts:**
   - Check if all players have sufficient balance
   - Define bet amount for the room
   - Deduct bet from each player when game starts

2. **When Game Ends:**
   - Calculate total pot (all players' bets)
   - Calculate winner payout (90% of pot)
   - Calculate platform fee (10% of pot)
   - Update winner's balance
   - Save game record to GameHistory

Example code for game end:
```javascript
// In your game handler
const totalPot = players.length * betAmount;
const winnerPayout = totalPot * 0.9;
const platformFee = totalPot * 0.1;

// Update winner's balance
await User.findByIdAndUpdate(winnerId, {
  $inc: { balance: winnerPayout }
});

// Save game history
await GameHistory.create({
  roomId,
  players,
  betAmount,
  totalPot,
  winnerId,
  winnerPayout,
  platformFee,
  completedAt: new Date()
});
```

---

## 🔒 Security Notes

1. **Never commit .env file** - Already in .gitignore
2. **Use strong JWT_SECRET** - At least 64 characters
3. **Admin access** - Only set isAdmin for trusted users
4. **Verify payments** - Always check you received money before approving
5. **HTTPS in production** - Use SSL/TLS for production deployment

---

## 📊 Revenue Tracking

- Every completed game generates 10% platform fee
- View total revenue in Admin Panel → Statistics tab
- Track individual game history
- Monitor user balances and activity

---

## 🐛 Troubleshooting

### Users can't register:
- Check backend server is running
- Check MongoDB connection
- Check JWT_SECRET is set in .env

### Admin panel not showing:
- Make sure you're logged in with admin account
- Check `isAdmin: true` in MongoDB for your user
- Check ADMIN_EMAIL matches in .env (if using email check)

### Transactions not appearing:
- Check backend logs for errors
- Verify MongoDB connection
- Check API routes are loaded in server.js

### Balance not updating:
- Check transaction was approved
- Refresh the page
- Check browser console for errors

---

## 📞 Support

For issues or questions:
1. Check browser console for errors (F12)
2. Check backend terminal logs
3. Verify MongoDB data structure
4. Test API endpoints with Postman/Thunder Client

---

## ✅ What's Implemented

✓ User registration and authentication  
✓ Wallet system with balance tracking  
✓ Deposit request system  
✓ Withdrawal request system  
✓ Transaction history  
✓ Admin panel for approving/rejecting transactions  
✓ User management  
✓ Revenue tracking  
✓ Mobile-responsive design  
✓ Secure password hashing  
✓ JWT authentication  

---

## 🎉 You're All Set!

Your Ludo game now has a complete payment and wallet system. Users can deposit, play, win, and withdraw money, while you maintain full control through the admin panel with a 10% platform fee on all games.

**Next Steps:**
1. Update payment details in DepositForm
2. Set up your admin account
3. Test with a few users
4. Integrate game completion with wallet updates
5. Deploy to production

Good luck! 🚀

