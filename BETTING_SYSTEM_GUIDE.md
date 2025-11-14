# 🎰 Ludo Betting System - Complete Implementation Guide

## 📋 Overview

This guide explains the complete betting/wallet integration system for your multiplayer Ludo game. The system ensures users can only play if they have sufficient balance, automatically deducts bets when games start, and pays winners automatically (90/10 split).

---

## 🏗️ System Architecture

### Core Components

1. **Wallet System** - User deposits, withdrawals, balance management
2. **Betting System** - Room creation with bet amounts, balance verification
3. **Game Integration** - Automatic bet deduction and winner payouts
4. **Session Linking** - Connects wallet authentication to game sessions

---

## 💰 How It Works (User Flow)

### For Players:

1. **Register & Login**
   - User registers through `/auth/register` (phone + password)
   - Gets redirected to wallet dashboard

2. **Deposit Money**
   - User deposits via EVC Plus/Zaad
   - Admin approves deposit request
   - Balance is added to user account

3. **Create or Join Betting Game**
   - **Option A (Free Game):** Select "$0 - Free Game" when hosting
   - **Option B (Betting Game):** Select bet amount ($1, $5, $10, $20, $50, $100)
   - System shows bet amount in lobby (💰$X or 🆓)

4. **Balance Check Before Join**
   - System automatically verifies user has sufficient balance
   - If insufficient: Shows error "You need $X but have $Y"
   - If sufficient: User joins and game starts

5. **Automatic Bet Deduction**
   - When game starts (2-4 players ready)
   - System automatically deducts bet from each player
   - Example: 4 players × $10 bet = $40 total pot

6. **Play Game**
   - Normal Ludo gameplay
   - First player to get all pawns home wins

7. **Automatic Winner Payout**
   - Winner receives **90%** of total pot
   - Platform keeps **10%** as fee
   - Example: $40 pot → Winner gets $36, Platform gets $4
   - Money instantly added to winner's wallet

8. **Withdraw Winnings**
   - User requests withdrawal
   - Admin processes manually
   - Money sent to user's phone

---

## 🔧 Technical Implementation

### Backend Changes

#### 1. Room Model (`backend/models/room.js`)
**Added Fields:**
- `betAmount` - Amount each player must bet
- `requiresBet` - Whether this is a betting game
- `totalPot` - Total money in the pot
- `playerBets` - Array tracking who paid what
- `settled` - Whether money has been distributed

**Modified Methods:**
- `startGame()` - Now **async**, deducts bets from all players
- `endGame()` - Now **async**, pays winner automatically
- `addPlayer()` - Accepts `userId` parameter for wallet linking

#### 2. Player Model (`backend/models/player.js`)
**Added Fields:**
- `userId` - Links player to User account for balance checks

#### 3. Player Handler (`backend/handlers/playerHandler.js`)
**New Logic:**
- Checks if room requires betting
- Verifies user is authenticated (has userId in session)
- Checks user has sufficient balance
- Emits errors: `error:insufficientBalance`, `error:notAuthenticated`, `error:userNotFound`

#### 4. Game Routes (`backend/routes/game.js`)
**New API Endpoints:**
- `POST /api/game/set-session` - Links wallet login to game session
- `GET /api/game/session-info` - Gets current session info

#### 5. Socket Events
**New Events:**
- `game:payout` - Emitted when winner receives money (shows payout details)

---

### Frontend Changes

#### 1. Room Creation (`src/components/LoginPage/AddServer/AddServer.jsx`)
**New Features:**
- Bet amount dropdown (Free, $1, $5, $10, $20, $50, $100)
- Visual warning when bet selected
- Sends `betAmount` and `requiresBet` to backend

#### 2. Lobby Display (`src/components/LoginPage/JoinServer/ServersTable/ServersTable.jsx`)
**New Features:**
- Shows bet amount in "Bet" column
- 💰$X for betting games
- 🆓 for free games

#### 3. Join Room (`src/components/LoginPage/NameInput/NameInput.jsx`)
**New Features:**
- Handles insufficient balance errors
- Shows detailed error messages with shake animation
- Displays current balance vs required balance

#### 4. Game Over (`src/components/Gameboard/Gameboard.jsx`)
**New Features:**
- Displays payout information when game ends
- Shows winner payout, platform fee, and total pot
- Animated payout notification

#### 5. Wallet to Game Link (`src/components/Wallet/WalletDashboard.jsx`)
**New Features:**
- "Play Game" button calls `/api/game/set-session`
- Links wallet userId to game session
- Enables balance checks during gameplay

---

## 🔒 Security Features

### 1. Server-Side Validation
✅ All balance checks happen on **backend only**
✅ Frontend **cannot modify** balances directly
✅ Socket events authenticated via session

### 2. Atomic Transactions
✅ Bet deduction and payout use async/await
✅ All players deducted before game starts
✅ Money only paid once (`settled` flag prevents double-payout)

### 3. Balance Verification
✅ Balance checked before joining room
✅ Balance verified again when game starts
✅ If insufficient during start, logged as error

### 4. Session Security
✅ JWT tokens for wallet authentication
✅ Session cookies for game authentication
✅ UserId linked via secure API endpoint

---

## 📊 Revenue Tracking

### Platform Earnings
- **10% of every withdrawal** (already implemented in admin panel)
- **10% of every betting game pot** (new feature)

### Example:
- **Game 1:** 4 players × $10 = $40 pot → Platform gets $4
- **Game 2:** 2 players × $20 = $40 pot → Platform gets $4
- **User Withdraws:** $100 withdrawal → Platform gets $10
- **Total Revenue:** $4 + $4 + $10 = $18

View revenue in **Admin Panel → 💰 Revenue Tab**

---

## 🎮 Testing the System

### Test Scenario 1: Free Game
1. Host a room with "$0 - Free Game"
2. Join with any account (no balance needed)
3. Play and win
4. No money deducted or paid

### Test Scenario 2: Betting Game (Sufficient Balance)
1. User A has $50 balance
2. Host room with $10 bet
3. 4 players join (each has ≥$10)
4. Game starts → Each loses $10 (4 × $10 = $40 pot)
5. User A wins → Gets $36 (90%), Platform keeps $4 (10%)
6. Check User A's balance: $50 - $10 + $36 = $76

### Test Scenario 3: Insufficient Balance
1. User B has $5 balance
2. Try to join $10 bet room
3. Error shown: "You need $10 but have $5.00. Please deposit money."
4. User cannot join

---

## 🐛 Troubleshooting

### Problem: User can join betting game without balance
**Solution:** Check `TEST_MODE` in `backend/middleware/auth.js` - must be `false`

### Problem: Balance not deducting
**Solution:** 
- Verify `room.requiresBet` is `true`
- Check `player.userId` is set
- Ensure `startGame()` is called with `await`

### Problem: Winner not getting paid
**Solution:**
- Check `room.settled` flag (should be `false` before payout)
- Verify winner's userId exists in database
- Check backend console for error logs

### Problem: Session not linking wallet to game
**Solution:**
- Verify `/api/game/set-session` is called before navigating
- Check `credentials: 'include'` in fetch request
- Ensure session middleware is configured correctly

---

## 📝 Database Schema

### Room Collection
```javascript
{
    _id: ObjectId,
    name: String,
    betAmount: Number,          // NEW
    requiresBet: Boolean,       // NEW
    totalPot: Number,          // NEW
    playerBets: [{             // NEW
        userId: ObjectId,
        username: String,
        color: String,
        betAmount: Number,
        paid: Boolean
    }],
    settled: Boolean,          // NEW
    players: [...],
    pawns: [...],
    // ... other fields
}
```

### Player Schema
```javascript
{
    sessionID: String,
    name: String,
    color: String,
    ready: Boolean,
    nowMoving: Boolean,
    userId: ObjectId           // NEW - Links to User
}
```

### GameHistory Collection
```javascript
{
    roomId: String,
    players: [{
        userId: ObjectId,
        username: String,
        betAmount: Number,
        isWinner: Boolean
    }],
    betAmount: Number,
    totalPot: Number,
    winnerId: ObjectId,
    winnerPayout: Number,
    platformFee: Number,
    startedAt: Date,
    completedAt: Date
}
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set `TEST_MODE = false` in `backend/middleware/auth.js`
- [ ] Set `TEST_MODE = false` in `src/utils/api.js`
- [ ] Configure proper JWT_SECRET in `.env`
- [ ] Set up MongoDB connection string
- [ ] Create superadmin account
- [ ] Test full flow: deposit → bet → win → withdraw
- [ ] Verify revenue tracking in admin panel
- [ ] Check all error handlers work correctly
- [ ] Test on mobile devices

---

## 🎯 Key Features Summary

✅ **Balance Requirement** - Users must have money to play betting games
✅ **Automatic Deduction** - Bets deducted when game starts
✅ **Automatic Payout** - Winner paid instantly (90/10 split)
✅ **Free Games** - Option to play without betting
✅ **Visual Indicators** - Clear display of bet amounts in lobby
✅ **Error Handling** - Helpful messages for insufficient balance
✅ **Revenue Tracking** - Platform earns 10% of all pots
✅ **Security** - All money operations server-side only
✅ **Session Linking** - Seamless wallet to game connection

---

## 📞 Support

If you encounter any issues:
1. Check backend console logs for detailed errors
2. Verify all `TEST_MODE` flags are set correctly
3. Ensure MongoDB connection is stable
4. Check that session middleware is working
5. Review this guide's troubleshooting section

---

**Built with ❤️ for your Ludo gaming platform**
**Last Updated:** November 11, 2025

