
# MapleKaede CMS 🍁
A Modern, Full-Featured MapleStory v83 Private Server Website

## 🌟 Overview
MapleKaede CMS is a cutting-edge Content Management System built specifically for MapleStory v83 private servers. Powered by Next.js 15 and TypeScript, it delivers a premium web experience with modern features, stunning animations, and enterprise-grade security.

## ✨ Key Features

### Player Features
- 🏠 Modern Landing Page - Animated hero sections with falling maple leaves  
- 👤 User Dashboard - Real-time character viewer with equipment display  
- 🎮 Character Renderer - Live 2D character rendering with all equipment  
- 🗳️ Smart Vote System - Automated NX rewards with webhook integration  
- 📊 Live Rankings - Real-time leaderboards with personal rank tracking  
- 💾 Download Center - Integrated client download with setup guides  
- 🔔 Announcements - Stay updated with server news and events  

### Admin Features
- 👑 Admin Panel - Comprehensive server management interface  
- 📢 Announcement System - Create and manage server announcements  
- 👥 User Management - Monitor players, reset passwords, manage accounts  
- 📈 Live Statistics - Real-time server metrics and player counts  
- 🔒 Role-Based Access - Secure admin authentication  

### Technical Features
- 🚀 Production Ready - Optimized build with proper error handling  
- 🌐 Public IP Support - Access from anywhere, not just localhost  
- 🔐 Secure Authentication - JWT tokens with httpOnly cookies  
- 🛡️ Advanced Security - Rate limiting, SQL injection protection, CORS  
- 📱 Fully Responsive - Beautiful on desktop and mobile devices  
- ⚡ Lightning Fast - Server-side rendering with Next.js 15  

## 🖥️ Prerequisites
**Required Software**
- Node.js (v18 or higher)  
- MySQL (v5.7 or higher)  
- Git (optional)  

**MapleStory Requirements**
- MapleStory v83 Server (OdinMS/HeavenMS based)  
- MySQL Database with v83 schema  

## 🚀 Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/maplekaede-cms.git
cd maplekaede-cms
```
Or download as ZIP and extract to your desired location.

### Step 2: Install Dependencies
```bash
npm install
# or if you encounter issues:
npm install --legacy-peer-deps
```

### Step 3: Configure Environment
Create a `.env.local` file:
```env
# Database Configuration (if MySQL is on same machine)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=cosmic

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here-make-it-random

# VOTE SYSTEM
GTOP100_PINGBACK_KEY=(You can generate any key)

# Server URL - CHANGE THIS TO YOUR PUBLIC IP OR DOMAIN
NEXT_PUBLIC_API_URL=http://your-public-ip:3000
# Examples:
# NEXT_PUBLIC_API_URL=http://local-network:3000
# NEXT_PUBLIC_API_URL=http://your-public-ip:3000
# NEXT_PUBLIC_API_URL=https://yourdomain.com     (domain name)

# Hostname Configuration (NEW)
NEXT_PUBLIC_HOSTNAME=your-public-ip
# Examples:
# NEXT_PUBLIC_HOSTNAME=192.168.1.100
# NEXT_PUBLIC_HOSTNAME=your-public-ip
# NEXT_PUBLIC_HOSTNAME=yourdomain.com

# CORS Configuration (NEW)
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.100:3000,http://your-public-ip:3000
# Example:
# ALLOWED_ORIGINS=http://localhost:3000,http://your-public-ip:3000,https://yourdomain.com

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here

# Next.js Environment
NODE_ENV=production

# Development Settings (NEW)
# Set to true to allow external connections during development
NEXT_TELEMETRY_DISABLED=1
```

### Step 4: Database Setup
- Navigate to `database/` folder  
- Import SQL files  
- Ensure these tables: `accounts`, `characters`, `inventoryitems`, and CMS-specific ones

### Step 5: Build and Run
**Development Mode**
```bash
npm run dev
```

**Production Mode**
```bash
npm run build
npm run start
```

## 📁 Project Structure
```
maplekaede/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── services/
│   └── types/
├── public/
├── database/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## 🎮 Usage Guide

### For Players
- Register at `/auth`
- Dashboard: view characters, vote, download client

### For Admins
- Log in with GM account
- Access `/admin` panel

## 🔧 Configuration
- Port Forwarding for Public Access
- Setup Discord Webhooks
- Enable HTTPS with NGINX

## 🎨 Customization
- Change Name, Theme Colors
- Add Custom Features (API, UI)

## 🐛 Troubleshooting
- Build errors: `rm -rf .next && npm run build`
- Increase memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`
- DB/Auth: Check credentials, clear cookies

## 🚀 Production Deployment
**Using PM2**
```bash
npm install -g pm2
pm2 start npm --name "maplekaede" -- start
pm2 save
pm2 startup
```

## 📊 Optimization
- Use Cloudflare CDN
- Add DB indexes
- Use Redis for sessions
- Optimize assets

## 🤝 Contributing
1. Fork repo
2. Create feature branch
3. Push changes
4. Open PR

## 📜 License
MIT License

## 🙏 Acknowledgments
MapleStory community, Cosmicms, Next.js, React contributors

## 📞 Support
- Discord: ARtistjr
- GitHub Issues contact me discord.

Made with ❤️ for the MapleStory community.
