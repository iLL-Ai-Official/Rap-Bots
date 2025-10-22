# 🚀 Monetization System Setup Guide

## Quick Start

This guide will help you set up and configure the complete monetization system for Rap Bots.

---

## 📋 Prerequisites

1. **Stripe Account** (for payments)
   - Sign up at [stripe.com](https://stripe.com)
   - Get your API keys (test and live)

2. **Google AdSense Account** (for ad revenue)
   - Apply at [adsense.google.com](https://www.google.com/adsense)
   - Get approved (typically takes 1-2 weeks)

3. **CashApp Business Account** (optional, for CashApp payments)
   - Set up at [cash.app](https://cash.app)

---

## 🔧 Configuration Steps

### 1. Stripe Setup

#### Get Your API Keys
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**

#### Set Environment Variables
```bash
# Add to your .env file
STRIPE_SECRET_KEY=sk_test_51ABC...
VITE_STRIPE_PUBLIC_KEY=pk_test_51ABC...
```

#### Set Up Webhook
1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. URL: `https://yourdomain.com/api/stripe-webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret**

```bash
# Add to your .env file
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

#### Create Products and Prices
Run the setup script:
```bash
npm run setup-stripe-products
```

Or manually create in Stripe Dashboard:
- **Premium Subscription**: $9.99/month (recurring)
- **Pro Subscription**: $19.99/month (recurring)
- **Battle Pack (10)**: $1.00 (one-time)
- **Battle Pack (1500)**: $100.00 (one-time)

---

### 2. Google AdSense Setup

#### Apply for AdSense
1. Go to [adsense.google.com](https://www.google.com/adsense)
2. Sign in with your Google account
3. Submit your website for review
4. Wait for approval (1-2 weeks typically)

#### Get Your Publisher ID
Once approved:
1. Log in to AdSense Dashboard
2. Go to **Account** → **Account information**
3. Copy your **Publisher ID** (looks like `ca-pub-XXXXXXXXXXXXXXXX`)

#### Configure Environment Variable
```bash
# Add to your .env file
VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

#### Update HTML
The AdSense script is already added to `client/index.html`. Just update the client ID:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"></script>
```

#### Create Ad Units
1. In AdSense Dashboard, go to **Ads** → **Overview**
2. Click **By ad unit**
3. Create the following ad units:
   - **Home Banner**: Display ad, Responsive
   - **Battle Interstitial**: Display ad, Full screen
   - **Rewarded Video**: Rewarded video ad
4. Copy the **Ad Slot IDs** for each unit

#### Update Ad Components
In your code, update the slot IDs:
```tsx
// In Home.tsx
<AdBanner slot="YOUR_HOME_BANNER_SLOT_ID" />

// In battle-arena.tsx
<InterstitialAd /> // Uses default slot
```

---

### 3. CashApp Setup (Optional)

#### Set Up CashApp
1. Download CashApp mobile app
2. Create a business account or use personal
3. Your CashApp tag (e.g., `$ILLAITHEGPTSTORE`)

The CashApp integration is already configured in the code to use `$ILLAITHEGPTSTORE`. Update if needed:
```typescript
// In server/routes.ts
metadata: {
  ...(paymentMethod === 'cashapp' && { cashapp_account: '$YOURCASHTAG' })
}
```

---

### 4. Database Migration

Run the database migration to ensure all monetization tables exist:
```bash
npm run db:push
```

This creates/updates:
- `users` table with subscription fields
- `processedWebhookEvents` table for idempotency
- `userClones` table for clone battles

---

## 🧪 Testing

### Test Subscriptions

#### Test Cards (Stripe)
Use these test cards in test mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC works.

#### Test Flow
1. Go to `/subscribe?tier=premium`
2. Enter test card details
3. Complete payment
4. Verify webhook processes correctly
5. Check user subscription status updates

### Test Battle Packs

1. Go to home page when out of battles
2. Click "Buy Battles"
3. Select pack (10 or 1500 battles)
4. Complete payment with test card
5. Verify battles added to account

### Test Ads

#### Local Testing (Without AdSense)
The ad components work in "demo mode" without real AdSense:
- Banner ads show placeholder
- Rewarded videos simulate 3-second playback
- Interstitial ads show countdown

#### With AdSense (Production)
1. Deploy to production domain
2. Ensure AdSense is approved for your domain
3. Test with actual ad units
4. Monitor AdSense dashboard for impressions

### Test Clone Battles

1. Create a clone: Go to `/clone`
2. Generate clone (analyzes your battles)
3. Battle your clone
4. Verify clone sponsorship shows (if configured)

---

## 📊 Monitoring

### Stripe Dashboard
Monitor:
- Successful payments
- Failed payments
- Subscription statuses
- Webhook events

### AdSense Dashboard
Monitor:
- Ad impressions
- CTR (Click-through rate)
- RPM (Revenue per mille)
- Estimated earnings

### Application Logs
Check server logs for:
```
💰 Payment intent created
✅ Added X battles to user
📊 Ad Impression: banner
🎁 Rewarded user with X battles
```

---

## 🔐 Security Checklist

- [ ] Never commit `.env` file to Git
- [ ] Use test keys in development
- [ ] Use live keys only in production
- [ ] Verify webhook signatures
- [ ] Implement rate limiting on API endpoints
- [ ] Use HTTPS in production
- [ ] Validate all user inputs
- [ ] Implement proper error handling
- [ ] Log all payment events
- [ ] Monitor for suspicious activity

---

## 🚀 Going Live

### Pre-Launch Checklist

1. **Stripe**
   - [ ] Switch to live API keys
   - [ ] Update webhook endpoint to production URL
   - [ ] Test live payments with small amounts
   - [ ] Verify refund process works

2. **AdSense**
   - [ ] Ensure domain is approved
   - [ ] Update ad units with production IDs
   - [ ] Set ad density appropriately
   - [ ] Comply with AdSense policies

3. **Testing**
   - [ ] Test full payment flow
   - [ ] Test subscription cancellation
   - [ ] Test battle pack purchases
   - [ ] Test ad display for free users
   - [ ] Test rewarded video flow

4. **Legal**
   - [ ] Update Terms of Service
   - [ ] Update Privacy Policy
   - [ ] Add refund policy
   - [ ] Comply with GDPR/CCPA if applicable

### Launch Steps

1. Deploy to production
2. Switch environment variables to production
3. Monitor logs for first 24 hours
4. Check Stripe dashboard for payments
5. Monitor AdSense for impressions
6. Be ready to handle support requests

---

## 💡 Optimization Tips

### Maximize Ad Revenue
- Place ads where users naturally pause (between battles)
- Use rewarded videos when users need something (more battles)
- Don't overload with ads (hurts UX and conversions)
- Test different ad placements with A/B testing

### Maximize Subscription Conversions
- Show clear value proposition (no ads, more battles)
- Highlight premium features prominently
- Offer free trial (optional)
- Use scarcity ("Limited time offer")
- Make cancellation easy (builds trust)

### Reduce Churn
- Send reminder emails before renewal
- Offer pause/downgrade options
- Ask for feedback before cancellation
- Provide excellent customer support
- Add new features regularly

---

## 🆘 Troubleshooting

### "Webhook signature verification failed"
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint URL is correct
- Verify webhook is set up in Stripe Dashboard

### "Ads not showing"
- Check `VITE_ADSENSE_CLIENT_ID` is set
- Ensure AdSense account is approved
- Check browser console for errors
- Verify ad blocker is not interfering

### "Payment succeeded but battles not added"
- Check server logs for webhook processing
- Verify webhook event reached server
- Check database for processed events
- Manually check user's battle count

### "Clone battles not working"
- Ensure user has created a clone
- Check clone ID is valid
- Verify battle creation endpoint works
- Check database for clone record

---

## 📞 Support

### Resources
- **Stripe Docs**: https://stripe.com/docs
- **AdSense Help**: https://support.google.com/adsense
- **App Support**: Open an issue on GitHub

### Common Questions

**Q: How long does AdSense approval take?**
A: Typically 1-2 weeks, but can vary. Ensure your site has quality content and follows AdSense policies.

**Q: Can I test ads without AdSense approval?**
A: Yes, the components work in demo mode without real AdSense integration.

**Q: What happens if a user's payment fails?**
A: Stripe will automatically retry. The webhook will update subscription status to inactive if payment ultimately fails.

**Q: How do refunds work?**
A: Process refunds through Stripe Dashboard. The webhook will automatically update the user's account.

**Q: Can users upgrade/downgrade their subscription?**
A: Yes, implement this through Stripe's subscription update API (not yet in current implementation).

---

## ✅ Launch Checklist

Copy this checklist before going live:

```
Environment Setup:
[ ] Production .env file configured
[ ] Stripe live keys set
[ ] AdSense client ID set
[ ] Database migrated

Stripe Setup:
[ ] Products created
[ ] Prices created
[ ] Webhook endpoint added
[ ] Webhook secret configured
[ ] Test payment successful

AdSense Setup:
[ ] Account approved
[ ] Ad units created
[ ] Ads showing on site
[ ] Policies compliant

Testing:
[ ] Subscription flow works
[ ] Battle pack purchases work
[ ] Webhook processing works
[ ] Ads display correctly
[ ] Rewarded videos work
[ ] Clone battles work

Legal:
[ ] Terms updated
[ ] Privacy policy updated
[ ] Refund policy added

Monitoring:
[ ] Stripe dashboard accessible
[ ] AdSense dashboard accessible
[ ] Server logs monitored
[ ] Error tracking set up

Launch:
[ ] All systems green
[ ] Ready for customers!
```

---

**You're ready to monetize! 💰🚀**

For questions or issues, refer to the main [MONETIZATION_STRATEGY.md](./MONETIZATION_STRATEGY.md) documentation.
