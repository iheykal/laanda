# Environment Variables Setup Guide

Please add the following variables to your `backend/.env` file:

## Server Configuration
```
PORT=3000
NODE_ENV=development
```

## Database Configuration
```
MONGODB_URI=mongodb+srv://username:<password>@clustername.mongodb.net/<dbname>?retryWrites=true&w=majority
```

## JWT Configuration
Add a strong secret key for JWT tokens (at least 32 characters):
```
JWT_SECRET=your_very_long_and_secure_random_secret_key_here_make_it_at_least_32_characters
```

To generate a secure JWT secret, you can use Node.js:
```javascript
require('crypto').randomBytes(64).toString('hex')
```

## Admin Configuration
Set your admin email (users with this email will have admin access):
```
ADMIN_EMAIL=your_admin_email@example.com
```

## Complete .env File Example
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://madmin:<password>@clustername.mongodb.net/ludo?retryWrites=true&w=majority
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ADMIN_EMAIL=admin@yourdomain.com
```

## Security Notes
- Never commit your .env file to git
- Use a strong, random JWT_SECRET
- Keep your MongoDB credentials secure
- Only set ADMIN_EMAIL to your own trusted email address

