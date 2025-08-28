# 🚀 Weatherguessr Deployment Guide

This guide will help you deploy Weatherguessr to various free hosting platforms.

## 📋 Prerequisites

- A GitHub account (for most platforms)
- The Weatherguessr files in a repository

## 🎯 Quick Deploy Options

### 1. GitHub Pages (Recommended)

**Steps:**
1. Push your code to a GitHub repository
2. Go to repository Settings → Pages
3. Select "Deploy from a branch"
4. Choose `main` branch and `/ (root)` folder
5. Click "Save"
6. Your site will be available at `https://yourusername.github.io/repository-name`

**Pros:** Free, reliable, automatic updates
**Cons:** Requires GitHub account

### 2. Netlify (Drag & Drop)

**Steps:**
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder to the deploy area
3. Your site is instantly live!
4. Get a custom URL like `https://your-site-name.netlify.app`

**Pros:** Super easy, custom domains, automatic HTTPS
**Cons:** Limited features on free tier

### 3. Vercel

**Steps:**
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub account
3. Import your repository
4. Deploy automatically

**Pros:** Fast, great performance, automatic deployments
**Cons:** Requires GitHub integration

### 4. Firebase Hosting

**Steps:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

**Pros:** Google's infrastructure, reliable
**Cons:** Requires Google account, CLI setup

## 🌐 Custom Domain Setup

### GitHub Pages
1. Add custom domain in repository Settings → Pages
2. Update DNS records with your domain provider
3. Wait for propagation (up to 24 hours)

### Netlify
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Update DNS records as instructed

## 📱 PWA Features (Optional)

To make Weatherguessr a Progressive Web App:

1. Add a `manifest.json` file:
```json
{
  "name": "Weatherguessr",
  "short_name": "Weatherguessr",
  "description": "US Weather Geography Game",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

2. Add to your HTML:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#667eea">
```

## 🔧 Performance Optimization

### Before Deployment:
1. Minify CSS and JavaScript (optional)
2. Optimize images
3. Enable gzip compression (automatic on most platforms)

### Testing:
- Test on mobile devices
- Check loading speed
- Verify all features work

## 🛠️ Troubleshooting

### Common Issues:

**Site not loading:**
- Check file paths (case-sensitive)
- Ensure `index.html` is in the root directory
- Verify all files are committed

**Scores not saving:**
- Check browser console for errors
- Ensure localStorage is enabled
- Test in incognito mode

**Styling issues:**
- Clear browser cache
- Check CSS file paths
- Verify responsive design

## 📊 Analytics (Optional)

Add Google Analytics:
1. Create Google Analytics account
2. Add tracking code to `<head>` section
3. Monitor user engagement

## 🔒 Security Considerations

- No sensitive data is stored
- All data is client-side only
- No backend required
- HTTPS is automatic on most platforms

## 📈 Monitoring

After deployment:
- Monitor site performance
- Check for broken links
- Test on different browsers
- Gather user feedback

## 🎉 Success!

Once deployed, share your Weatherguessr game with friends and family!

**Example URLs:**
- `https://yourusername.github.io/weatherguessr`
- `https://weatherguessr.netlify.app`
- `https://weatherguessr.vercel.app`

---

Need help? Check the platform's documentation or create an issue in your repository!
