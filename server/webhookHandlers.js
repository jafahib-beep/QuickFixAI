const { getStripeSync, getUncachableStripeClient } = require('./stripeClient');
const { pool } = require('./db');
const { activatePaidSubscription, downgradeToFree, getUserByStripeCustomerId } = require('./services/subscription');

class WebhookHandlers {
  // Fix B: Ensure webhook_events table exists for idempotency
  static async ensureWebhookEventsTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        session_id VARCHAR(255),
        processed_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  // Fix B: Check if webhook was already processed (idempotency)
  static async isWebhookProcessed(eventId) {
    const result = await pool.query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    return result.rows.length > 0;
  }

  // Fix B: Mark webhook as processed
  static async markWebhookProcessed(eventId, eventType, sessionId) {
    await pool.query(
      `INSERT INTO webhook_events (event_id, event_type, session_id) 
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, sessionId || null]
    );
  }

  static async processWebhook(payload, signature, uuid) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // First, let stripe-replit-sync handle the webhook
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    // Then handle app-specific logic by parsing the event
    try {
      // Ensure webhook_events table exists
      await this.ensureWebhookEventsTable();
      
      const stripe = await getUncachableStripeClient();
      const event = JSON.parse(payload.toString());
      
      console.log(`[Webhook] Processing event: ${event.type} (id: ${event.id})`);
      
      // Fix B: Idempotency check - skip if already processed
      if (await this.isWebhookProcessed(event.id)) {
        console.log(`[Webhook] Event ${event.id} already processed, skipping`);
        return;
      }
      
      await this.handleStripeEvent(event, stripe);
      
      // Fix B: Mark event as processed
      await this.markWebhookProcessed(event.id, event.type, event.data?.object?.id);
      console.log(`[Webhook] Marked event ${event.id} as processed`);
    } catch (error) {
      console.error('[Webhook] Error processing app-specific logic:', error.message);
      // Don't throw - the sync was successful, our app logic can fail gracefully
    }
  }

  static async handleStripeEvent(event, stripe) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Webhook] Checkout completed for customer: ${session.customer}`);
        
        // Get user by Stripe customer ID
        const user = await getUserByStripeCustomerId(session.customer);
        if (!user) {
          // Try to get userId from metadata
          const userId = session.metadata?.userId;
          if (userId) {
            // Update user's stripe_customer_id
            await pool.query(
              'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
              [session.customer, userId]
            );
            console.log(`[Webhook] Linked customer ${session.customer} to user ${userId}`);
          } else {
            console.error('[Webhook] No user found for customer:', session.customer);
            return;
          }
        }
        
        // If it's a subscription checkout, activate subscription
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const userId = user?.id || session.metadata?.userId;
          
          if (userId) {
            const periodEnd = new Date(subscription.current_period_end * 1000);
            await activatePaidSubscription(userId, subscription.id, periodEnd);
            console.log(`[Webhook] Activated subscription for user ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[Webhook] Subscription ${event.type}: ${subscription.id}, status: ${subscription.status}`);
        
        const user = await getUserByStripeCustomerId(subscription.customer);
        if (!user) {
          console.log('[Webhook] No user found for subscription customer:', subscription.customer);
          return;
        }

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const periodEnd = new Date(subscription.current_period_end * 1000);
          await activatePaidSubscription(user.id, subscription.id, periodEnd);
          console.log(`[Webhook] Updated subscription for user ${user.id}, valid until ${periodEnd.toISOString()}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`[Webhook] Subscription deleted: ${subscription.id}`);
        
        const user = await getUserByStripeCustomerId(subscription.customer);
        if (user) {
          await downgradeToFree(user.id);
          console.log(`[Webhook] Downgraded user ${user.id} to free plan`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`[Webhook] Payment succeeded for invoice: ${invoice.id}`);
        
        // Renew subscription period using activatePaidSubscription to reset image_counter
        if (invoice.subscription) {
          const stripe = await getUncachableStripeClient();
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const user = await getUserByStripeCustomerId(invoice.customer);
          
          if (user && (subscription.status === 'active' || subscription.status === 'trialing')) {
            const periodEnd = new Date(subscription.current_period_end * 1000);
            // Fix B: Use activatePaidSubscription to reset image_counter on renewal
            await activatePaidSubscription(user.id, subscription.id, periodEnd);
            console.log(`[Webhook] Renewed subscription for user ${user.id} until ${periodEnd.toISOString()}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[Webhook] Payment failed for invoice: ${invoice.id}`);
        
        const user = await getUserByStripeCustomerId(invoice.customer);
        if (user) {
          await pool.query(
            'UPDATE users SET subscription_status = $1 WHERE id = $2',
            ['past_due', user.id]
          );
          console.log(`[Webhook] Marked user ${user.id} as past_due`);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  }
}

module.exports = { WebhookHandlers };
