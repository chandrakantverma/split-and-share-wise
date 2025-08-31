# 💰 Split and Share Wise - Expense Management App

A full-stack web application similar to Splitwise, where users can track and split their day-to-day expenses. Built with React, TypeScript, Tailwind CSS, and Supabase.

![Split and Share Wise](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-blue?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-2.39.0-green?style=for-the-badge&logo=supabase)

## 🌟 Features

### ✅ Core Features
- **User Authentication & Profiles** - Email/password login & signup with profile management
- **Groups & Friends** - Create groups and add friends by email
- **Expense Management** - Add expenses with equal splitting among participants
- **Dashboard & Balances** - Track total owed, total owed to you, and net balance
- **Settle Up Functionality** - Record payments and clear debts
- **Activity Feed** - View expense history and recent activities

### 🎯 Key Capabilities
- Create and manage expense groups (e.g., "Roommates", "Trip to Goa")
- Add friends and send friend requests
- Split expenses equally among group members
- Track who owes whom with real-time balance updates
- Record settlements and payment history
- Search and filter friends and groups
- Responsive design for mobile and desktop

## 🚀 Live Demo

**🌐 Application**: [https://split-and-share-wise.vercel.app](https://split-and-share-wise.vercel.app)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Hooks + Context API
- **Deployment**: GitHub Pages + GitHub Actions

## 📱 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Dashboard+View)

### Add Expense
![Add Expense](https://via.placeholder.com/800x400/10B981/FFFFFF?text=Add+Expense+Form)

### Groups Management
![Groups](https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=Groups+Management)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chandrakantverma/split-and-share-wise.git
   cd split-and-share-wise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 🗄️ Database Setup

### Supabase Configuration
1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Update your environment variables with Supabase credentials

### Database Schema
- **profiles** - User profile information
- **groups** - Expense groups
- **group_members** - Group membership
- **expenses** - Expense records
- **expense_participants** - Who owes what for each expense
- **settlements** - Payment records
- **friendships** - Friend relationships

## 📁 Project Structure

```
split-and-share-wise/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── integrations/  # External service integrations
│   └── lib/           # Utility functions
├── supabase/          # Database migrations and config
├── public/            # Static assets
└── .github/           # GitHub Actions workflows
```

## 🚀 Deployment

### GitHub Pages (Automatic)
- Push to `main` branch triggers automatic deployment
- Deployed to: `https://chandrakantverma.github.io/split-and-share-wise/`

### Manual Deployment
```bash
npm run build
# Deploy the `dist` folder to your hosting service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

If you have any questions or need help:
- Create an [issue](https://github.com/chandrakantverma/split-and-share-wise/issues)
- Contact: [chandrakantverma@example.com](mailto:chandrakantverma@example.com)

---

⭐ **Star this repository if you find it helpful!**
