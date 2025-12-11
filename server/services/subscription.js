const { pool } = require('../db');
const { awardXpDirect } = require('./xp');

const SUBSCRIPTION_CONFIG = {
  PRICE_SEK: 39,
  TRIAL_DAYS: 5,
  FREE_DAILY_IMAGES: 2,
  PREMIUM_XP_BONUS: 250
};

async function getUserSubscription(userId) {
  const result = await pool.query(
    `SELECT subscription_plan, subscription_status, trial_started_at, trial_ends_at, 
            paid_until, stripe_customer_id, stripe_subscription_id, premium_xp_granted
     FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  const now = new Date();
  
  let effectivePlan = 'free';
  let isActive = false;
  
  if (user.subscription_plan === 'paid' && user.paid_until && new Date(user.paid_until) > now) {
    effectivePlan = 'paid';
    isActive = true;
  } else if (user.subscription_plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > now) {
    effectivePlan = 'trial';
    isActive = true;
  }
  
  return {
    plan: effectivePlan,
    status: user.subscription_status,
    isActive,
    isPremium: effectivePlan === 'paid' || effectivePlan === 'trial',
    trialStartedAt: user.trial_started_at,
    trialEndsAt: user.trial_ends_at,
    paidUntil: user.paid_until,
    stripeCustomerId: user.stripe_customer_id,
    stripeSubscriptionId: user.stripe_subscription_id,
    premiumXpGranted: user.premium_xp_granted
  };
}

async function getDailyImageUsage(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await pool.query(
    `SELECT images_sent FROM liveassist_usage 
     WHERE user_id = $1 AND usage_date = $2`,
    [userId, today]
  );
  
  return result.rows.length > 0 ? result.rows[0].images_sent : 0;
}

async function incrementImageUsage(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  await pool.query(
    `INSERT INTO liveassist_usage (user_id, usage_date, images_sent)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, usage_date) 
     DO UPDATE SET images_sent = liveassist_usage.images_sent + 1, updated_at = NOW()`,
    [userId, today]
  );
}

async function checkImageLimit(userId) {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription) {
    return { allowed: false, reason: 'User not found' };
  }
  
  if (subscription.isPremium) {
    return { allowed: true, isPremium: true, imagesUsed: 0, limit: Infinity };
  }
  
  const imagesUsed = await getDailyImageUsage(userId);
  const limit = SUBSCRIPTION_CONFIG.FREE_DAILY_IMAGES;
  
  if (imagesUsed >= limit) {
    return {
      allowed: false,
      reason: 'daily_limit_reached',
      isPremium: false,
      imagesUsed,
      limit,
      message: `You've reached your free limit of ${limit} images per day. Upgrade to Premium for unlimited access.`
    };
  }
  
  return {
    allowed: true,
    isPremium: false,
    imagesUsed,
    limit,
    remaining: limit - imagesUsed
  };
}

async function canUploadVideo(userId) {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription) {
    return { allowed: false, reason: 'User not found' };
  }
  
  if (subscription.isPremium) {
    return { allowed: true, isPremium: true };
  }
  
  return {
    allowed: false,
    isPremium: false,
    reason: 'premium_required',
    message: 'Video upload requires Premium subscription.'
  };
}

async function updateUserSubscription(userId, updates) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  
  const allowedFields = [
    'subscription_plan', 'subscription_status', 'trial_started_at', 
    'trial_ends_at', 'paid_until', 'stripe_customer_id', 
    'stripe_subscription_id', 'premium_xp_granted'
  ];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  if (setClauses.length === 0) {
    return null;
  }
  
  setClauses.push(`updated_at = NOW()`);
  values.push(userId);
  
  const result = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  return result.rows[0];
}

async function startTrial(userId) {
  const subscription = await getUserSubscription(userId);
  
  if (subscription && (subscription.plan === 'trial' || subscription.plan === 'paid')) {
    return { success: false, error: 'User already has an active subscription or trial' };
  }
  
  const now = new Date();
  const trialEnds = new Date(now.getTime() + SUBSCRIPTION_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000);
  
  await updateUserSubscription(userId, {
    subscription_plan: 'trial',
    subscription_status: 'trialing',
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEnds.toISOString()
  });
  
  console.log(`[Subscription] Started trial for user ${userId}, ends ${trialEnds.toISOString()}`);
  
  return {
    success: true,
    trialStartedAt: now,
    trialEndsAt: trialEnds
  };
}

async function activatePaidSubscription(userId, stripeSubscriptionId, periodEnd) {
  const subscription = await getUserSubscription(userId);
  
  let xpResult = null;
  if (!subscription?.premiumXpGranted) {
    xpResult = await awardXpDirect(userId, SUBSCRIPTION_CONFIG.PREMIUM_XP_BONUS, 'premium_purchase');
    await updateUserSubscription(userId, { premium_xp_granted: true });
    console.log(`[Subscription] Awarded ${SUBSCRIPTION_CONFIG.PREMIUM_XP_BONUS} XP to user ${userId} for premium purchase`);
  }
  
  await updateUserSubscription(userId, {
    subscription_plan: 'paid',
    subscription_status: 'active',
    stripe_subscription_id: stripeSubscriptionId,
    paid_until: periodEnd.toISOString()
  });
  
  console.log(`[Subscription] Activated paid subscription for user ${userId}, valid until ${periodEnd.toISOString()}`);
  
  return {
    success: true,
    paidUntil: periodEnd,
    xpAwarded: xpResult?.xpAwarded || 0
  };
}

async function cancelSubscription(userId) {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription || !subscription.isPremium) {
    return { success: false, error: 'No active subscription to cancel' };
  }
  
  await updateUserSubscription(userId, {
    subscription_status: 'canceled'
  });
  
  console.log(`[Subscription] Canceled subscription for user ${userId}`);
  
  return { success: true };
}

async function downgradeToFree(userId) {
  await updateUserSubscription(userId, {
    subscription_plan: 'free',
    subscription_status: 'none',
    paid_until: null
  });
  
  console.log(`[Subscription] Downgraded user ${userId} to free plan`);
  
  return { success: true };
}

async function getUserByStripeCustomerId(stripeCustomerId) {
  const result = await pool.query(
    `SELECT id, email, display_name FROM users WHERE stripe_customer_id = $1`,
    [stripeCustomerId]
  );
  return result.rows[0] || null;
}

module.exports = {
  SUBSCRIPTION_CONFIG,
  getUserSubscription,
  getDailyImageUsage,
  incrementImageUsage,
  checkImageLimit,
  canUploadVideo,
  updateUserSubscription,
  startTrial,
  activatePaidSubscription,
  cancelSubscription,
  downgradeToFree,
  getUserByStripeCustomerId
};
