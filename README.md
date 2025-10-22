# FractionalBase ($FRAC) Landing Page

Premium landing page for FractionalBase token ecosystem, built with Next.js 14 and featuring a minimal black/white/gray design with subtle blue accents.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## 📋 Features

### SEO & Meta Tags ✅
- Complete Open Graph tags for social sharing
- Twitter Card meta tags
- JSON-LD structured data for search engines
- Favicon support
- Optimized metadata for all pages

### Functional Components ✅
- **Waitlist Form**: Fully functional email capture with API integration
  - Client-side validation
  - Loading states
  - Error handling
  - Success feedback
- **API Route**: `/api/waitlist` endpoint ready for integration
- **Legal Pages**: Privacy Policy and Terms of Service

### Analytics Ready ✅
- Google Analytics 4 integration
- Conditional loading based on environment variable
- Page view tracking

### Performance Optimizations ✅
- Mobile-optimized animations (disabled on touch devices)
- Reduced motion preference support (accessibility)
- Small bundle size: 138 kB first load
- Static site generation (SSG)

### Design System
- **Colors**: Black (#000000), near-black (#0a0a0a), gray text, subtle blue accent (#60a5fa)
- **Typography**: Massive headings (text-9xl), extreme whitespace
- **Layout**: Bento grids, minimal design
- **Animations**: Magnetic buttons, blur reveal, 3D card tilt, smooth scroll snap

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Google Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Email Service Integration (optional)
MAILCHIMP_API_KEY=
MAILCHIMP_LIST_ID=
MAILCHIMP_DC=
```

### Email Service Integration

The waitlist API (`/src/app/api/waitlist/route.ts`) currently stores emails in memory. To integrate with a real email service:

**Option 1: Mailchimp**
```typescript
// Uncomment the Mailchimp code in /src/app/api/waitlist/route.ts
// Add API credentials to .env.local
```

**Option 2: ConvertKit**
```bash
npm install @convertkit/convertkit-node
# Follow ConvertKit integration guide
```

**Option 3: SendGrid**
```bash
npm install @sendgrid/mail
# Follow SendGrid integration guide
```

**Option 4: Database**
```bash
# Add your preferred database (PostgreSQL, MongoDB, etc.)
# Update the API route to save emails to database
```

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

### Netlify

```bash
# Build command
npm run build

# Publish directory
out
```

### Static Hosting (AWS S3, Cloudflare Pages, etc.)

```bash
# Build static files
npm run build

# Upload the 'out' directory to your hosting provider
```

## 📁 Project Structure

```
frac-website/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with metadata
│   │   ├── page.tsx             # Home page
│   │   ├── globals.css          # Global styles
│   │   ├── privacy/             # Privacy Policy page
│   │   ├── terms/               # Terms of Service page
│   │   └── api/
│   │       └── waitlist/        # Waitlist API endpoint
│   ├── components/
│   │   ├── analytics/           # Google Analytics component
│   │   ├── sections/            # Page sections
│   │   └── shared/              # Reusable components
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utilities and animations
├── public/                      # Static assets
├── .env.example                 # Environment variables template
└── next.config.js              # Next.js configuration
```

## 🎨 Customization

### Colors

Edit `tailwind.config.ts` to customize the color scheme:

```typescript
colors: {
  accent: {
    blue: '#60a5fa',           // Change accent color
  },
  bg: {
    black: '#000000',          // Background color
  },
  // ... more colors
}
```

### Content

- **Hero Section**: `/src/components/sections/HeroSection.tsx`
- **Core Utilities**: `/src/components/sections/CoreUtilitiesSection.tsx`
- **Waitlist CTA**: `/src/components/sections/CTANewsletterBanner.tsx`
- **Footer**: `/src/components/sections/FooterSection.tsx`

### Social Links

Update footer in `/src/components/sections/FooterSection.tsx` when ready:

```typescript
// Add your social media links
<a href="https://twitter.com/yourhandle">Twitter</a>
<a href="https://discord.gg/yourinvite">Discord</a>
```

## 🧪 Testing

```bash
# Run type checking
npx tsc --noEmit

# Run linting
npm run lint

# Test production build locally
npm run build && npm start
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Animations are automatically disabled on:
- Touch devices (for performance)
- Users with reduced motion preference (accessibility)

## 🔒 Security

- Client-side email validation
- Server-side validation in API routes
- No sensitive data exposed
- HTTPS required for production

## 📄 License

© 2025 FractionalBase. All rights reserved.

## 🤝 Support

For issues or questions, contact:
- Email: support@fractionalbase.com
- Twitter: @fractionalbase

## 🎯 Roadmap

**Completed:**
- ✅ SEO optimization
- ✅ Functional waitlist
- ✅ Legal pages
- ✅ Analytics integration
- ✅ Mobile optimization

**Future Enhancements:**
- Social media integration (when handles are ready)
- Email service integration (Mailchimp/ConvertKit)
- Blog/news section
- FAQ section
- Multi-language support

---

Built with Next.js 14, Tailwind CSS, and Framer Motion.
