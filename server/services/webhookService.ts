import axios from 'axios';
import { storage } from '../storage';
import { WebhookType, webhooks } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

/**
 * Service for handling outgoing webhooks
 */
export class WebhookService {
  /**
   * Process a contact creation event by sending relevant webhooks
   * @param contactId The ID of the contact that was created
   */
  async processContactCreation(contactId: number): Promise<void> {
    try {
      console.log(`[WebhookService] DETECTED EVENT: contact_created for contact ID: ${contactId}`);
      
      // Get the created contact
      const contact = await storage.getContact(contactId);
      if (!contact) {
        console.error(`[WebhookService] Contact not found with ID: ${contactId}`);
        return;
      }
      
      console.log(`[WebhookService] Contact data:`, JSON.stringify(contact, null, 2));
      
      // Get all outgoing webhooks configured for contact_created event
      const allWebhooks = await storage.getWebhooksByType(1, WebhookType.OUTGOING); // Assuming user_id = 1
      console.log(`[WebhookService] All outgoing webhooks:`, allWebhooks.map(w => ({id: w.id, event: w.trigger_event, active: w.is_active})));
      
      const contactCreatedWebhooks = allWebhooks.filter(
        webhook => webhook.is_active && webhook.trigger_event === 'contact_created'
      );
      
      console.log(`[WebhookService] Found ${contactCreatedWebhooks.length} active webhooks for contact_created event`);
      console.log('[WebhookService] Webhook IDs for contact_created event:', contactCreatedWebhooks.map(w => w.id).join(', '));
      
      // Process each webhook
      for (const webhook of contactCreatedWebhooks) {
        await this.sendWebhook(webhook, contact);
      }
    } catch (error) {
      console.error('[WebhookService] Error processing contact creation:', error);
      await storage.logError(
        'WebhookService.processContactCreation',
        error instanceof Error ? error.message : 'Unknown error processing contact creation',
        error instanceof Error ? error.stack : undefined,
        { contactId }
      );
    }
  }
  
  /**
   * Process a contact update event by sending relevant webhooks
   * @param contactId The ID of the contact that was updated
   */
  async processContactUpdate(contactId: number): Promise<void> {
    try {
      console.log(`[WebhookService] DETECTED EVENT: contact_updated for contact ID: ${contactId}`);
      
      // Get the updated contact
      const contact = await storage.getContact(contactId);
      if (!contact) {
        console.error(`[WebhookService] Contact not found with ID: ${contactId}`);
        return;
      }
      
      console.log(`[WebhookService] Contact data:`, JSON.stringify(contact, null, 2));
      
      // Get all outgoing webhooks
      const allWebhooks = await storage.getWebhooksByType(1, WebhookType.OUTGOING); // Assuming user_id = 1
      console.log(`[WebhookService] All outgoing webhooks:`, allWebhooks.map(w => ({id: w.id, event: w.trigger_event, active: w.is_active})));
      
      // Filter to get only active webhooks with trigger_event = contact_updated
      const contactUpdatedWebhooks = allWebhooks.filter(
        webhook => webhook.is_active && webhook.trigger_event === 'contact_updated'
      );
      
      console.log(`[WebhookService] Found ${contactUpdatedWebhooks.length} active webhooks for contact_updated event`);
      console.log('[WebhookService] Webhook IDs for contact_updated event:', contactUpdatedWebhooks.map(w => w.id).join(', '));
      
      // Process each webhook
      for (const webhook of contactUpdatedWebhooks) {
        await this.sendWebhook(webhook, contact);
      }
    } catch (error) {
      console.error('[WebhookService] Error processing contact update:', error);
      await storage.logError(
        'WebhookService.processContactUpdate',
        error instanceof Error ? error.message : 'Unknown error processing contact update',
        error instanceof Error ? error.stack : undefined,
        { contactId }
      );
    }
  }
  
  /**
   * Send data to a webhook endpoint
   * @param webhook The webhook configuration
   * @param contact The contact data to send
   */
  private async sendWebhook(webhook: any, contact: any): Promise<void> {
    try {
      console.log(`[WebhookService] Preparing to send webhook ID ${webhook.id} to ${webhook.target_url}`);
      
      // Prepare webhook payload based on the template and selected fields
      const payload = this.preparePayload(webhook, contact);
      console.log(`[WebhookService] Prepared payload:`, JSON.stringify(payload, null, 2));
      
      // Prepare headers
      const headers: Record<string, string> = {};
      if (Array.isArray(webhook.headers)) {
        webhook.headers.forEach((header: any) => {
          if (header && header.key) {
            headers[header.key] = header.value || '';
          }
        });
      } else if (typeof webhook.headers === 'object') {
        Object.assign(headers, webhook.headers);
      }
      
      // Ensure Content-Type is set
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      
      console.log(`[WebhookService] Request headers:`, headers);
      console.log(`[WebhookService] Sending webhook to ${webhook.target_url} using method ${webhook.http_method || 'POST'}`);
      
      // Send the webhook
      const response = await axios({
        method: webhook.http_method || 'POST',
        url: webhook.target_url,
        headers,
        data: payload
      });
      
      console.log(`[WebhookService] Webhook sent successfully. Status: ${response.status}`);
      console.log(`[WebhookService] Response data:`, response.data);
      
      // Update last_triggered timestamp in the database
      try {        
        // Update both last_triggered and updated_at
        await db
          .update(webhooks)
          .set({ 
            last_triggered: new Date(),
            updated_at: new Date()
          })
          .where(eq(webhooks.id, webhook.id));
          
        console.log(`[WebhookService] Updated last_triggered timestamp for webhook ID: ${webhook.id}`);
      } catch (updateError) {
        console.error(`[WebhookService] Error updating last_triggered for webhook ID ${webhook.id}:`, updateError);
      }
      
    } catch (error) {
      console.error('[WebhookService] Error sending webhook:', error);
      if (axios.isAxiosError(error)) {
        console.error('[WebhookService] Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
      }
      
      await storage.logError(
        'WebhookService.sendWebhook',
        error instanceof Error ? error.message : 'Unknown error sending webhook',
        error instanceof Error ? error.stack : undefined,
        { 
          webhookId: webhook.id, 
          contactId: contact.id,
          targetUrl: webhook.target_url,
          httpMethod: webhook.http_method
        }
      );
    }
  }
  
  /**
   * Prepare webhook payload using the configured template and selected fields
   * @param webhook The webhook configuration
   * @param contact The contact data
   * @returns The formatted payload
   */
  private preparePayload(webhook: any, contact: any): any {
    // Default to empty JSON if no template
    if (!webhook.payload_template) {
      console.log('[WebhookService] No payload template found, using default empty payload');
      return {};
    }
    
    try {
      console.log(`[WebhookService] Using payload template: ${webhook.payload_template}`);
      console.log(`[WebhookService] Selected fields: ${webhook.selected_fields ? webhook.selected_fields.join(', ') : 'none'}`);
      
      // For complex objects like tags, it's better to create a structured payload directly
      // instead of trying to handle it through string templating
      
      // We'll use the template as a base structure but construct a proper object
      // that we can easily manipulate
      let baseTemplate: any;
      try {
        baseTemplate = JSON.parse(webhook.payload_template);
      } catch (err) {
        console.error(`[WebhookService] Error parsing template, using fallback: ${err}`);
        baseTemplate = {
          event_type: "{event.type}",
          timestamp: "{event.timestamp}",
          data: {
            contact_id: "{contact.id}",
            email: "{contact.email}",
            name: "{contact.name}"
          }
        };
      }
      
      // Function to recursively replace template variables in an object
      const processTemplateObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(item => processTemplateObject(item));
        }
        
        const result: Record<string, any> = {};
        
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Handle special case for tags
            if (value === '{contact.tags}') {
              result[key] = Array.isArray(contact.tags) ? contact.tags : [];
            }
            // Handle other variables
            else {
              let processedValue = value.toString();
              // Replace template variables
              const templateVars = {
                '{event.type}': webhook.trigger_event,
                '{event.timestamp}': new Date().toISOString(),
                '{contact.id}': contact.id,
                '{contact.email}': contact.email || '',
                '{contact.name}': contact.name || ''
              };
              
              Object.entries(templateVars).forEach(([varKey, varValue]) => {
                processedValue = processedValue.replace(
                  new RegExp(varKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                  varValue
                );
              });
              
              result[key] = processedValue;
            }
          } else if (typeof value === 'object') {
            result[key] = processTemplateObject(value);
          } else {
            result[key] = value;
          }
        });
        
        return result;
      };
      
      // Process the template object
      const parsedPayload = processTemplateObject(baseTemplate);
      console.log(`[WebhookService] Final payload:`, parsedPayload);
      
      return parsedPayload;
    } catch (error) {
      console.error('[WebhookService] Error preparing payload:', error);
      
      // If there's an error in the template, return a basic payload
      const fallbackPayload = {
        event_type: webhook.trigger_event,
        timestamp: new Date().toISOString(),
        data: {
          contact_id: contact.id,
          email: contact.email || '',
          name: contact.name || '',
          tags: Array.isArray(contact.tags) ? contact.tags : []
        }
      };
      
      console.log(`[WebhookService] Using fallback payload:`, fallbackPayload);
      return fallbackPayload;
    }
  }
}

// Export an instance of the service
export const webhookService = new WebhookService();