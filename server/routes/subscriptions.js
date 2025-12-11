const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getUncachableStripeClient, getStripePublishableKey } = require('../stripeClient');
const {
  SUBSCRIPTION_CONFIG,
  getUserSubscription,
  getDailyImageUsage,
  checkImageLimit,
  canUploadVideo,
  updateUserSubscription,
  startTrial,
  cancelSubscription,
  activatePaidSubscription,
  getUserByStripeCustomerId
} = require('../services/subscription');

const router = express.Router();

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const imagesUsed = await getDailyImageUsage(req.userId);
    
    res.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
        isPremium: subscription.isPremium,
        trialEndsAt: subscription.trialEndsAt,
        paidUntil: subscription.paidUntil
      },
      usage: {
        imagesUsedToday: imagesUsed,
        dailyImageLimit: subscription.isPremium ? null : SUBSCRIPTION_CONFIG.FREE_DAILY_IMAGES,
        canUploadVideo: subscription.isPremium
      },
      config: {
        priceSek: SUBSCRIPTION_CONFIG.PRICE_SEK,
        trialDays: SUBSCRIPTION_CONFIG.TRIAL_DAYS
      }
    });
  } catch (error) {
    console.error('[Subscription] Status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

router.get('/check-image-limit', authMiddleware, async (req, res) => {
  try {
    const result = await checkImageLimit(req.userId);
    res.json(result);
  } catch (error) {
    console.error('[Subscription] Check image limit error:', error);
    res.status(500).json({ error: 'Failed to check image limit' });
  }
});

router.get('/can-upload-video', authMiddleware, async (req, res) => {
  try {
    const result = await canUploadVideo(req.userId);
    res.json(result);
  } catch (error) {
    console.error('[Subscription] Can upload video error:', error);
    res.status(500).json({ error: 'Failed to check video upload permission' });
  }
});

router.post('/start-trial', authMiddleware, async (req, res) => {
  try {
    const result = await startTrial(req.userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      trialStartedAt: result.trialStartedAt,
      trialEndsAt: result.trialEndsAt,
      message: `Your ${SUBSCRIPTION_CONFIG.TRIAL_DAYS}-day free trial has started!`
    });
  } catch (error) {
    console.error('[Subscription] Start trial error:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
});

router.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    
    const userResult = await pool.query(
      'SELECT id, email, display_name, stripe_customer_id FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.display_name,
        metadata: { userId: user.id }
      });
      
      await updateUserSubscription(req.userId, {
        stripe_customer_id: customer.id
      });
      
      customerId = customer.id;
      console.log(`[Subscription] Created Stripe customer ${customerId} for user ${req.userId}`);
    }
    
    const prices = await stripe.prices.list({
      lookup_keys: ['liveassist_premium_monthly'],
      active: true,
      limit: 1
    });
    
    let priceId;
    if (prices.data.length > 0) {
      priceId = prices.data[0].id;
    } else {
      const allPrices = await stripe.prices.list({
        active: true,
        type: 'recurring',
        limit: 10
      });
      
      const liveassistPrice = allPrices.data.find(p => 
        p.unit_amount === SUBSCRIPTION_CONFIG.PRICE_SEK * 100 && 
        p.currency === 'sek'
      );
      
      if (liveassistPrice) {
        priceId = liveassistPrice.id;
      } else if (allPrices.data.length > 0) {
        priceId = allPrices.data[0].id;
        console.log('[Subscription] Using first available price:', priceId);
      } else {
        return res.status(400).json({ 
          error: 'No subscription price configured. Please run the seed script first.' 
        });
      }
    }
    
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: SUBSCRIPTION_CONFIG.TRIAL_DAYS,
        metadata: {
          userId: req.userId
        }
      },
      success_url: `${baseUrl}/?subscription=success`,
      cancel_url: `${baseUrl}/?subscription=canceled`,
      metadata: {
        userId: req.userId
      }
    });
    
    console.log(`[Subscription] Created checkout session ${session.id} for user ${req.userId}`);
    
    res.json({ 
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('[Subscription] Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.userId);
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }
    
    const stripe = await getUncachableStripeClient();
    
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    await cancelSubscription(req.userId);
    
    console.log(`[Subscription] Canceled subscription for user ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Your subscription has been canceled. You will retain access until the end of your billing period.',
      accessUntil: subscription.paidUntil
    });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.post('/reactivate', authMiddleware, async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.userId);
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No subscription to reactivate' });
    }
    
    const stripe = await getUncachableStripeClient();
    
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });
    
    await updateUserSubscription(req.userId, {
      subscription_status: 'active'
    });
    
    console.log(`[Subscription] Reactivated subscription for user ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Your subscription has been reactivated!'
    });
  } catch (error) {
    console.error('[Subscription] Reactivate error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

router.get('/publishable-key', async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error('[Subscription] Get publishable key error:', error);
    res.status(500).json({ error: 'Failed to get Stripe publishable key' });
  }
});

module.exports = router;
