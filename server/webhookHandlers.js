const { getStripeSync, getUncachableStripeClient } = require('./stripeClient');
const { pool } = require('./db');
const { activatePaidSubscription, downgradeToFree, getUserByStripeCustomerId, getUserSubscription } = require('./services/subscription');
const { wsManager } = require('./services/websocket');

class WebhookHandlers {
  // Ensure webhook_events table exists for idempotency and auditing
  static async ensureWebhookEventsTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        session_id VARCHAR(255),
        user_id UUID,
        payload_summary JSONB,
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

  // Mark webhook as processed with full audit trail
  static async markWebhookProcessed(eventId, eventType, sessionId, userId, payloadSummary) {
    await pool.query(
      `INSERT INTO webhook_events (event_id, event_type, session_id, user_id, payload_summary) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, sessionId || null, userId || null, payloadSummary ? JSON.stringify(payloadSummary) : null]
    );
    console.log(`[Webhook] AUDIT: Recorded event ${eventId} type=${eventType} session=${sessionId} user=${userId}`);
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
      
      console.log(`[Webhook] ====== PROCESSING EVENT ======`);
      console.log(`[Webhook] Event ID: ${event.id}`);
      console.log(`[Webhook] Event Type: ${event.type}`);
      console.log(`[Webhook] Object ID: ${event.data?.object?.id}`);
      
      // Idempotency check - skip if already processed
      if (await this.isWebhookProcessed(event.id)) {
        console.log(`[Webhook] SKIPPED: Event ${event.id} already processed`);
        return;
      }
      
      // Handle the event and get the resolved userId
      const result = await this.handleStripeEvent(event, stripe);
      const resolvedUserId = result?.userId;
      
      // Create audit payload summary (masked sensitive data)
      const payloadSummary = {
        objectId: event.data?.object?.id,
        customer: event.data?.object?.customer,
        metadataUserId: event.data?.object?.metadata?.userId,
        subscriptionMetadataUserId: event.data?.object?.subscription_data?.metadata?.userId,
        mode: event.data?.object?.mode,
        status: event.data?.object?.status
      };
      
      // Mark event as processed with full audit trail
      await this.markWebhookProcessed(event.id, event.type, event.data?.object?.id, resolvedUserId, payloadSummary);
      console.log(`[Webhook] ====== EVENT PROCESSED ======`);
    } catch (error) {
      console.error('[Webhook] Error processing app-specific logic:', error.message);
      // Don't throw - the sync was successful, our app logic can fail gracefully
    }
  }

  static async handleStripeEvent(event, stripe) {
    let resolvedUserId = null;
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Webhook] ====== CHECKOUT.SESSION.COMPLETED ======`);
        console.log(`[Webhook] Session ID: ${session.id}`);
        console.log(`[Webhook] Customer ID: ${session.customer}`);
        console.log(`[Webhook] Mode: ${session.mode}`);
        console.log(`[Webhook] Subscription ID: ${session.subscription}`);
        console.log(`[Webhook] Session metadata: ${JSON.stringify(session.metadata)}`);
        console.log(`[Webhook] Client reference ID: ${session.client_reference_id}`);
        
        // CRITICAL: Extract userId from multiple possible sources
        let userId = session.metadata?.userId || session.client_reference_id;
        
        // Try to get user by Stripe customer ID first
        let user = await getUserByStripeCustomerId(session.customer);
        
        if (!user) {
          if (!userId) {
            // FAIL LOUDLY: No way to identify user
            console.error(`[Webhook] CRITICAL ERROR: Cannot identify user!`);
            console.error(`[Webhook] Session ID: ${session.id}`);
            console.error(`[Webhook] Customer ID: ${session.customer}`);
            console.error(`[Webhook] metadata.userId: ${session.metadata?.userId}`);
            console.error(`[Webhook] client_reference_id: ${session.client_reference_id}`);
            console.error(`[Webhook] Full session payload: ${JSON.stringify(session)}`);
            return { userId: null, error: 'Cannot identify user - no metadata.userId or client_reference_id' };
          }
          
          // Link customer to user
          await pool.query(
            'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
            [session.customer, userId]
          );
          console.log(`[Webhook] Linked customer ${session.customer} to user ${userId}`);
        } else {
          userId = user.id;
        }
        
        resolvedUserId = userId;
        
        // If it's a subscription checkout, activate subscription
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log(`[Webhook] Retrieved subscription: ${subscription.id}, status: ${subscription.status}`);
          
          const periodEnd = new Date(subscription.current_period_end * 1000);
          
          // ATOMIC UPDATE: Activate subscription with all fields
          const activationResult = await activatePaidSubscription(userId, subscription.id, periodEnd);
          console.log(`[Webhook] Activation result: ${JSON.stringify(activationResult)}`);
          
          // Verify DB state after update
          const verifyResult = await pool.query(
            `SELECT id, email, subscription_plan, subscription_status, paid_until, stripe_subscription_id 
             FROM users WHERE id = $1`,
            [userId]
          );
          const updatedUser = verifyResult.rows[0];
          console.log(`[Webhook] DB VERIFY after update: plan=${updatedUser?.subscription_plan}, status=${updatedUser?.subscription_status}, paid_until=${updatedUser?.paid_until}`);
          
          // Emit subscription.updated via WebSocket with socket IDs
          wsManager.emitSubscriptionUpdated(userId, {
            subscription_status: 'paid',
            subscription_expiry: periodEnd.toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[Webhook] ====== ${event.type.toUpperCase()} ======`);
        console.log(`[Webhook] Subscription ID: ${subscription.id}`);
        console.log(`[Webhook] Customer ID: ${subscription.customer}`);
        console.log(`[Webhook] Status: ${subscription.status}`);
        console.log(`[Webhook] Subscription metadata: ${JSON.stringify(subscription.metadata)}`);
        
        // Try to get userId from subscription metadata first, then customer lookup
        let userId = subscription.metadata?.userId;
        const user = await getUserByStripeCustomerId(subscription.customer);
        
        if (!user && !userId) {
          console.error(`[Webhook] CRITICAL: No user found for subscription!`);
          console.error(`[Webhook] Customer ID: ${subscription.customer}`);
          console.error(`[Webhook] Subscription metadata: ${JSON.stringify(subscription.metadata)}`);
          return { userId: null, error: 'No user found' };
        }
        
        userId = user?.id || userId;
        resolvedUserId = userId;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const periodEnd = new Date(subscription.current_period_end * 1000);
          await activatePaidSubscription(userId, subscription.id, periodEnd);
          
          // Verify DB state
          const verifyResult = await pool.query(
            `SELECT subscription_plan, subscription_status, paid_until FROM users WHERE id = $1`,
            [userId]
          );
          console.log(`[Webhook] DB VERIFY: ${JSON.stringify(verifyResult.rows[0])}`);
          
          // Emit subscription.updated via WebSocket
          wsManager.emitSubscriptionUpdated(userId, {
            subscription_status: 'paid',
            subscription_expiry: periodEnd.toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`[Webhook] ====== CUSTOMER.SUBSCRIPTION.DELETED ======`);
        console.log(`[Webhook] Subscription ID: ${subscription.id}`);
        console.log(`[Webhook] Customer ID: ${subscription.customer}`);
        
        const user = await getUserByStripeCustomerId(subscription.customer);
        if (user) {
          resolvedUserId = user.id;
          await downgradeToFree(user.id);
          console.log(`[Webhook] Downgraded user ${user.id} to free plan`);
          
          // Emit subscription.updated via WebSocket
          wsManager.emitSubscriptionUpdated(user.id, {
            subscription_status: 'free',
            subscription_expiry: null
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`[Webhook] ====== INVOICE.PAYMENT_SUCCEEDED ======`);
        console.log(`[Webhook] Invoice ID: ${invoice.id}`);
        console.log(`[Webhook] Customer ID: ${invoice.customer}`);
        console.log(`[Webhook] Subscription ID: ${invoice.subscription}`);
        
        // Renew subscription period using activatePaidSubscription to reset image_counter
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const user = await getUserByStripeCustomerId(invoice.customer);
          
          if (user && (subscription.status === 'active' || subscription.status === 'trialing')) {
            resolvedUserId = user.id;
            const periodEnd = new Date(subscription.current_period_end * 1000);
            await activatePaidSubscription(user.id, subscription.id, periodEnd);
            console.log(`[Webhook] Renewed subscription for user ${user.id} until ${periodEnd.toISOString()}`);
            
            // Verify DB state
            const verifyResult = await pool.query(
              `SELECT subscription_plan, subscription_status, paid_until FROM users WHERE id = $1`,
              [user.id]
            );
            console.log(`[Webhook] DB VERIFY: ${JSON.stringify(verifyResult.rows[0])}`);
            
            // Emit subscription.updated via WebSocket
            wsManager.emitSubscriptionUpdated(user.id, {
              subscription_status: 'paid',
              subscription_expiry: periodEnd.toISOString()
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[Webhook] ====== INVOICE.PAYMENT_FAILED ======`);
        console.log(`[Webhook] Invoice ID: ${invoice.id}`);
        console.log(`[Webhook] Customer ID: ${invoice.customer}`);
        
        const user = await getUserByStripeCustomerId(invoice.customer);
        if (user) {
          resolvedUserId = user.id;
          await pool.query(
            'UPDATE users SET subscription_status = $1 WHERE id = $2',
            ['past_due', user.id]
          );
          console.log(`[Webhook] Marked user ${user.id} as past_due`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        break;
    }
    
    return { userId: resolvedUserId };
  }
}

module.exports = { WebhookHandlers };
