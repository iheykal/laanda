# Create SuperAdmin Account

## Quick Start

Run this command to create your superadmin account:

```bash
cd backend
node scripts/createSuperAdmin.js
```

## SuperAdmin Credentials

- **Phone:** 610251014
- **Password:** ilyaasadmin

## What This Does

1. Connects to your MongoDB database
2. Checks if superadmin exists
3. If exists: Updates to superadmin status
4. If not: Creates new superadmin account
5. Sets proper permissions (isAdmin + isSuperAdmin)

## Login After Creation

1. Start your servers:
```bash
# Backend
cd backend
npm start

# Frontend (new terminal)
npm start
```

2. Go to login page:
```
http://localhost:3000/auth/login
```

3. Login with:
   - Phone: **610251014**
   - Password: **ilyaasadmin**

4. Access admin panel:
```
http://localhost:3000/admin
```

## Note

The password is automatically hashed using bcrypt for security.
The superadmin has full access to all admin features.

