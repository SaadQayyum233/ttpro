import express, { Request, Response } from 'express';
import { storage } from '../storage.database';
import { WebhookType } from '../../shared/schema';
import crypto from 'crypto';

// Create a router
const router = express.Router();

// Get all webhooks
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = 1; // Default user ID for development
    const webhooks = await storage.getWebhooksByUserId(userId);
    
    return res.status(200).json({
      success: true,
      webhooks
    });
  } catch (error) {
    console.error('Error getting webhooks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve webhooks'
    });
  }
});

// Get webhook by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const webhookId = parseInt(req.params.id);
    const webhook = await storage.getWebhook(webhookId);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      webhook
    });
  } catch (error) {
    console.error('Error getting webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve webhook'
    });
  }
});

// Create webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    console.log('Creating webhook with data:', webhookData);
    
    // Generate endpoint token for incoming webhooks
    if (webhookData.type === WebhookType.INCOMING) {
      webhookData.endpoint_token = crypto.randomUUID();
    }
    
    const webhook = await storage.createWebhook(webhookData);
    
    return res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      webhook
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create webhook'
    });
  }
});

// Update webhook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const webhookId = parseInt(req.params.id);
    const webhookData = req.body;
    
    console.log(`Updating webhook ${webhookId} with data:`, webhookData);
    
    // Check if webhook exists
    const existingWebhook = await storage.getWebhook(webhookId);
    if (!existingWebhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    // Update webhook
    const webhook = await storage.updateWebhook(webhookId, webhookData);
    
    return res.status(200).json({
      success: true,
      message: 'Webhook updated successfully',
      webhook
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update webhook'
    });
  }
});

// Delete webhook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const webhookId = parseInt(req.params.id);
    
    // Check if webhook exists
    const existingWebhook = await storage.getWebhook(webhookId);
    if (!existingWebhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    // Delete webhook
    const success = await storage.deleteWebhook(webhookId);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete webhook'
      });
    }
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete webhook'
    });
  }
});

// Receive incoming webhook data
router.post('/incoming/:provider/:token', async (req: Request, res: Response) => {
  try {
    const { provider, token } = req.params;
    const payload = req.body;
    
    console.log(`Received incoming webhook - Provider: ${provider}, Token: ${token}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Get all webhooks matching the provider and token
    const userId = 1; // Default user ID for development
    const webhooks = await storage.getWebhooksByType(userId, WebhookType.INCOMING);
    
    const matchingWebhook = webhooks.find(webhook => 
      webhook.provider === provider && 
      webhook.endpoint_token === token
    );
    
    if (!matchingWebhook) {
      console.log('No matching webhook found for token:', token);
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }
    
    // Check if webhook is active
    if (!matchingWebhook.is_active) {
      console.log('Webhook is inactive:', matchingWebhook.name);
      return res.status(403).json({
        success: false,
        message: 'Webhook is inactive'
      });
    }
    
    // Validate secret key if present
    if (matchingWebhook.secret_key) {
      const providedSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];
      
      if (!providedSecret || providedSecret !== matchingWebhook.secret_key) {
        console.log('Invalid webhook secret');
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook secret'
        });
      }
    }
    
    // Process webhook data based on event_handling mappings
    try {
      // Here you would process the webhook data according to the mappings
      // For now, just update the last_triggered timestamp
      await storage.updateWebhook(matchingWebhook.id, {
        last_triggered: new Date()
      });
      
      return res.status(200).json({
        success: true,
        message: 'Webhook received successfully'
      });
    } catch (processingError) {
      console.error('Error processing webhook data:', processingError);
      return res.status(422).json({
        success: false,
        message: 'Error processing webhook data'
      });
    }
  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test trigger for outgoing webhooks
router.post('/test-trigger/:webhook_id', async (req: Request, res: Response) => {
  try {
    const webhookId = parseInt(req.params.webhook_id);
    console.log(`[WebhookRoutes] Test trigger received for webhook ID: ${webhookId}`);
    
    // Get the webhook
    const webhook = await storage.getWebhook(webhookId);
    if (!webhook) {
      console.log(`[WebhookRoutes] Webhook not found with ID: ${webhookId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not found' 
      });
    }
    
    if (webhook.type !== WebhookType.OUTGOING) {
      return res.status(400).json({
        success: false,
        error: 'Cannot test an incoming webhook'
      });
    }
    
    // For now, just return a success response
    // In the future, we would actually make the outgoing request
    console.log(`[WebhookRoutes] Webhook test trigger completed successfully`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Outgoing webhook test triggered successfully (actual HTTP request not implemented yet)'
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test webhook'
    });
  }
});

export default router;