const { getUncachableStripeClient } = require('./stripeClient');

const SUBSCRIPTION_CONFIG = {
  PRICE_SEK: 39,
  TRIAL_DAYS: 5
};

async function createLiveAssistProduct() {
  console.log('[Seed] Starting LiveAssist Premium product creation...');
  
  try {
    const stripe = await getUncachableStripeClient();
    
    const existingProducts = await stripe.products.search({
      query: "name:'LiveAssist Premium'"
    });
    
    if (existingProducts.data.length > 0) {
      console.log('[Seed] LiveAssist Premium product already exists:', existingProducts.data[0].id);
      
      const existingPrices = await stripe.prices.list({
        product: existingProducts.data[0].id,
        active: true,
        limit: 5
      });
      
      if (existingPrices.data.length > 0) {
        console.log('[Seed] Existing prices:', existingPrices.data.map(p => ({
          id: p.id,
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval
        })));
        return {
          product: existingProducts.data[0],
          price: existingPrices.data[0]
        };
      }
    }
    
    console.log('[Seed] Creating new LiveAssist Premium product...');
    
    const product = await stripe.products.create({
      name: 'LiveAssist Premium',
      description: 'Unlock unlimited LiveAssist features: unlimited image analysis, video upload support, full AI responses, and premium badge.',
      metadata: {
        app: 'quickfix',
        feature: 'liveassist_permission',
        trial_days: String(SUBSCRIPTION_CONFIG.TRIAL_DAYS)
      }
    });
    
    console.log('[Seed] Created product:', product.id);
    
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: SUBSCRIPTION_CONFIG.PRICE_SEK * 100,
      currency: 'sek',
      recurring: {
        interval: 'month'
      },
      lookup_key: 'liveassist_premium_monthly',
      metadata: {
        display_name: `${SUBSCRIPTION_CONFIG.PRICE_SEK} SEK/month`,
        trial_days: String(SUBSCRIPTION_CONFIG.TRIAL_DAYS)
      }
    });
    
    console.log('[Seed] Created price:', {
      id: price.id,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring.interval
    });
    
    console.log('[Seed] LiveAssist Premium product setup complete!');
    console.log('[Seed] Product ID:', product.id);
    console.log('[Seed] Price ID:', price.id);
    console.log('[Seed] Price:', `${SUBSCRIPTION_CONFIG.PRICE_SEK} ${price.currency.toUpperCase()}/month`);
    console.log('[Seed] Trial:', `${SUBSCRIPTION_CONFIG.TRIAL_DAYS} days`);
    
    return { product, price };
  } catch (error) {
    console.error('[Seed] Error creating product:', error);
    throw error;
  }
}

if (require.main === module) {
  createLiveAssistProduct()
    .then(() => {
      console.log('[Seed] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Failed:', error);
      process.exit(1);
    });
}

module.exports = { createLiveAssistProduct };
