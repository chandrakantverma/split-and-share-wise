# 🚀 Deployment Guide

This guide explains how to deploy your Split and Share Wise application to various platforms.

## 🌐 GitHub Pages (Recommended)

### Automatic Deployment (GitHub Actions)

1. **Push to main branch** - The GitHub Actions workflow will automatically:
   - Build the application
   - Deploy to GitHub Pages
   - Update the live site

2. **Enable GitHub Pages**:
   - Go to your repository Settings
   - Navigate to Pages section
   - Set source to "GitHub Actions"

3. **Your site will be available at**:
   ```
   https://chandrakantverma.github.io/split-and-share-wise/
   ```

### Manual Deployment

```bash
# Build the application
npm run build

# The dist folder contains your built application
# Upload the contents of dist/ to your hosting service
```

## ☁️ Vercel (Alternative)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Follow the prompts** to connect your GitHub repository

## 🔧 Environment Variables

Make sure to set these environment variables in your deployment platform:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🐛 Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`
- Verify environment variables are set

### Deployment Issues
- Check GitHub Actions logs for build errors
- Verify the base path in `vite.config.ts` matches your repository name
- Ensure the `dist/` folder is being generated correctly

### Database Issues
- Verify Supabase connection in production
- Check RLS policies are properly configured
- Ensure environment variables are set correctly

## 🔄 Continuous Deployment

The GitHub Actions workflow automatically:
- Triggers on push to main branch
- Installs dependencies
- Builds the application
- Deploys to GitHub Pages
- Updates the live site

## 📊 Monitoring

- **GitHub Actions**: Check deployment status
- **Supabase Dashboard**: Monitor database performance
- **Browser Console**: Debug client-side issues
- **Network Tab**: Check API calls and responses

## 🚀 Performance Tips

- Enable gzip compression on your hosting service
- Use CDN for static assets
- Optimize images before uploading
- Enable browser caching
- Minimize bundle size with code splitting

---

For more help, check the [GitHub repository](https://github.com/chandrakantverma/split-and-share-wise) or create an issue. 