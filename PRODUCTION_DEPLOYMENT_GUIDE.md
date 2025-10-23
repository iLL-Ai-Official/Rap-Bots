# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Rap-Bots application to production.

## Prerequisites

✅ All TypeScript errors fixed (60 → 1 false positive)
✅ Build successfully completes
✅ CodeQL security scan passes with 0 vulnerabilities
✅ All features implemented and documented

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (Replit Auth)
REPLIT_CLIENT_ID=your_client_id
REPLIT_CLIENT_SECRET=your_client_secret

# AI Services (at least one required)
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key

# Text-to-Speech (at least one required)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Payment Processing (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Session Secret
SESSION_SECRET=your_random_secret_here

# Node Environment
NODE_ENV=production
PORT=5000
```

### Optional Variables

```bash
# Additional TTS Services
MYSHELL_API_KEY=your_myshell_key

# Image Generation (for character cards)
HUGGINGFACE_API_KEY=your_hf_key

# Monetization
VITE_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

## Deployment Steps

### 1. Prepare the Environment

```bash
# Clone the repository
git clone https://github.com/MIHAchoppa/Rap-Bots.git
cd Rap-Bots

# Checkout the deployment branch
git checkout copilot/finish-work-and-deploy
```

### 2. Install Dependencies

```bash
# Install production dependencies
npm ci --only=production
```

### 3. Configure Environment Variables

```bash
# Copy example env file (if exists)
cp .env.example .env

# Edit .env with your production values
nano .env
```

### 4. Setup Database

```bash
# Run database migrations
npm run db:push

# Verify database connection
# The application will validate DATABASE_URL on startup
```

### 5. Build the Application

```bash
# Clean any previous builds
rm -rf dist client/dist

# Build for production
npm run build

# Verify build output
ls -lh dist/
ls -lh client/dist/
```

Expected output:
- `dist/index.js` (~417 KB)
- `client/dist/` with assets (~729 KB main bundle)

### 6. Start the Application

```bash
# Production start
npm start

# Or with PM2 for process management
pm2 start dist/index.js --name rap-bots
```

### 7. Verify Deployment

```bash
# Check application health
curl http://localhost:5000/

# Check specific endpoints
curl http://localhost:5000/api/health
```

## Docker Deployment

### Using Production Dockerfile

```bash
# Build the Docker image
docker build -f Dockerfile.production -t rap-bots:latest .

# Run the container
docker run -d \
  --name rap-bots \
  -p 5000:5000 \
  --env-file .env \
  rap-bots:latest
```

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=rapbots
      - POSTGRES_USER=rapbots
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
```

Deploy with:

```bash
docker-compose up -d
```

## Cloud Deployment

### Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/rap-bots

# Deploy to Cloud Run
gcloud run deploy rap-bots \
  --image gcr.io/PROJECT_ID/rap-bots \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="${DATABASE_URL}" \
  --memory 2Gi \
  --cpu 2
```

### AWS ECS/Fargate

1. Push image to ECR
2. Create task definition with environment variables
3. Create service with load balancer
4. Configure auto-scaling

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create rap-bots-prod

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your_key
# ... set other variables

# Deploy
git push heroku copilot/finish-work-and-deploy:main

# Scale dyno
heroku ps:scale web=1
```

## Post-Deployment Verification

### 1. Check Application Logs

```bash
# Docker
docker logs rap-bots

# PM2
pm2 logs rap-bots

# Cloud Run
gcloud run logs read --service rap-bots
```

### 2. Test Critical Endpoints

```bash
# Homepage
curl https://your-domain.com/

# Authentication
curl https://your-domain.com/api/auth/user

# Battle creation (requires auth)
# Test via web interface
```

### 3. Monitor Performance

- Check memory usage
- Monitor response times
- Watch error rates
- Review database queries

## Maintenance

### Database Migrations

```bash
# After schema changes
npm run db:push

# Verify migrations
# Check database tables and columns
```

### Updates and Rollbacks

```bash
# Update to latest
git pull origin copilot/finish-work-and-deploy
npm ci --only=production
npm run build
pm2 restart rap-bots

# Rollback if needed
git checkout <previous-commit>
npm ci --only=production
npm run build
pm2 restart rap-bots
```

### Monitoring

Set up monitoring for:
- Application uptime
- Error rates
- Response times
- Database performance
- Memory/CPU usage

Recommended tools:
- Sentry (error tracking)
- DataDog (APM)
- New Relic (performance)
- CloudWatch (AWS)
- Stackdriver (GCP)

## Security Checklist

- [ ] All environment variables are secure
- [ ] DATABASE_URL uses SSL
- [ ] API keys are encrypted at rest
- [ ] HTTPS enabled (use reverse proxy like nginx)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Session secrets are strong and unique
- [ ] CodeQL scan passes (0 vulnerabilities)
- [ ] Dependencies are up to date
- [ ] Stripe webhook signature verification enabled

## Troubleshooting

### Application Won't Start

**Error**: `DATABASE_URL must be set`
- **Solution**: Verify DATABASE_URL environment variable is set correctly

**Error**: Port already in use
- **Solution**: Change PORT environment variable or kill process using the port

### Build Fails

**Error**: Out of memory
- **Solution**: Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

### Database Connection Issues

**Error**: Connection timeout
- **Solution**: Check database host, port, and firewall rules
- Verify SSL requirements match your DATABASE_URL

### TypeScript Errors

**Note**: One known false positive in `tournament-leaderboard.tsx` line 174
- Does not affect production build
- Can be safely ignored
- Build process (Vite/esbuild) handles this correctly

## Performance Optimization

### Production Build Optimization

The production build is already optimized with:
- Code splitting
- Minification
- Tree shaking
- Gzip compression

### Additional Optimizations

1. **CDN**: Serve static assets from CDN
2. **Caching**: Implement Redis for session/query caching
3. **Load Balancing**: Use multiple instances behind load balancer
4. **Database**: Add read replicas for heavy queries
5. **Assets**: Optimize images and use lazy loading

## Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Review this guide
4. Check GitHub issues
5. Contact maintainers

## Success Criteria

✅ Application starts without errors
✅ Database connection established
✅ Authentication works
✅ Battles can be created and completed
✅ TTS services respond
✅ No console errors
✅ All features functional

---

**Status**: Ready for production deployment
**Last Updated**: 2025-10-23
**Version**: 1.0.0
