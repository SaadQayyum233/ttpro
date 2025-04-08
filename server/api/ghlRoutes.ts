import express, { Request, Response } from 'express';
import axios from 'axios';
import { ghlConfig } from '../config/ghlConfig';
import { storage } from '../storage';
import { z } from 'zod';

// Session is already declared in server/index.ts, we don't need to re-declare it here

const router = express.Router();

// Schema for validating token data
const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string()
});

// Middleware to check if GHL is configured
const checkGHLConfig = (req: Request, res: Response, next: Function) => {
  if (!ghlConfig.clientId || !ghlConfig.clientSecret) {
    return res.status(500).json({ 
      error: 'GHL_CLIENT_ID or GHL_CLIENT_SECRET is not configured.' 
    });
  }
  next();
};

// Initiate GHL OAuth flow
router.get('/auth/ghl', (req: Request, res: Response) => {
  // Get client ID and client secret from query parameters (set in frontend)
  const clientId = req.query.client_id as string || ghlConfig.clientId;
  const clientSecret = req.query.client_secret as string || ghlConfig.clientSecret;
  
  // Check if client ID is provided
  if (!clientId) {
    return res.status(400).send(`
      <html>
        <body>
          <h2>Missing Client ID</h2>
          <p>Please go back to the integration form and enter your GHL Client ID.</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
  
  // Store in session for the callback to use
  if (req.session) {
    req.session.ghlClientId = clientId;
    req.session.ghlClientSecret = clientSecret;
  }
  
  // Build the authorization URL
  const authUrl = `${ghlConfig.authUrl}?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(ghlConfig.scopes)}&redirect_uri=${encodeURIComponent(ghlConfig.redirectUri)}`;
  
  res.redirect(authUrl);
});

// Handle OAuth callback
router.get('/auth/ghl/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const locationId = req.query.locationId as string;
  
  if (!code || !locationId) {
    return res.status(400).json({ 
      error: 'Authorization code or location ID is missing' 
    });
  }
  
  // Get client ID and secret from session or fallback to environment variables
  const clientId = req.session?.ghlClientId || ghlConfig.clientId;
  const clientSecret = req.session?.ghlClientSecret || ghlConfig.clientSecret;
  
  // Validate client ID and secret
  if (!clientId || !clientSecret) {
    return res.status(400).send(`
      <html>
        <body>
          <h2>Missing GoHighLevel Credentials</h2>
          <p>The Client ID or Client Secret is missing. Please go back to the integration form and enter your GHL credentials.</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(ghlConfig.tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: ghlConfig.redirectUri
    });
    
    // Validate response
    const validatedData = tokenResponseSchema.parse(tokenResponse.data);
    
    // Calculate expiration timestamp
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + validatedData.expires_in);
    
    // Store in database - using user ID 1 for now (will be updated in multi-user implementation)
    const userId = 1;
    
    // Check if connection already exists
    const existingConnection = await storage.getIntegrationConnection(userId, 'ghl');
    
    // Create config object with proper typing
    const connectionConfig = JSON.parse(JSON.stringify({ locationId }));

    // Create properly typed objects for update and insert
    const connectionUpdate = {
      access_token: validatedData.access_token,
      refresh_token: validatedData.refresh_token,
      token_expires_at: expiresAt,
      is_active: true,
      config: connectionConfig
    };
    
    const newConnection = {
      user_id: userId,
      provider: 'ghl',
      access_token: validatedData.access_token,
      refresh_token: validatedData.refresh_token,
      token_expires_at: expiresAt,
      is_active: true,
      config: connectionConfig
    };
    
    if (existingConnection) {
      // Update existing connection
      await storage.updateIntegrationConnection(existingConnection.id, connectionUpdate);
    } else {
      // Create new connection
      await storage.createIntegrationConnection(newConnection);
    }
    
    // Redirect to settings page with success message
    res.redirect('/settings/integrations?success=ghl-connected');
    
  } catch (error) {
    await storage.logError(
      'GHL OAuth Callback',
      error instanceof Error ? error.message : 'Unknown error during GHL authentication',
      error instanceof Error ? error.stack : undefined,
      { code, locationId }
    );
    
    res.redirect('/settings/integrations?error=ghl-auth-failed');
  }
});

// Get GHL connection status
router.get('/connection-status', async (req: Request, res: Response) => {
  try {
    // Using user ID 1 for now
    const userId = 1;
    const connection = await storage.getIntegrationConnection(userId, 'ghl');
    
    if (!connection || !connection.is_active) {
      return res.json({ connected: false });
    }
    
    // Check if token is expired
    const now = new Date();
    if (connection.token_expires_at) {
      const isExpired = new Date(connection.token_expires_at) < now;
      
      if (isExpired && connection.refresh_token) {
        try {
          // Try to refresh the token
          await refreshToken(connection.id, connection.refresh_token);
          return res.json({ connected: true });
        } catch (error) {
          return res.json({ connected: false, reason: 'Token expired and refresh failed' });
        }
      }
    }
    
    return res.json({ connected: true });
    
  } catch (error) {
    await storage.logError(
      'GHL Connection Status',
      error instanceof Error ? error.message : 'Unknown error checking GHL connection',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to check GHL connection status' });
  }
});

// Refresh GHL token
async function refreshToken(connectionId: number, refreshToken: string): Promise<void> {
  try {
    const response = await axios.post(ghlConfig.tokenUrl, {
      client_id: ghlConfig.clientId,
      client_secret: ghlConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    
    const validatedData = tokenResponseSchema.parse(response.data);
    
    // Calculate new expiration timestamp
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + validatedData.expires_in);
    
    // Update connection in database
    // Create properly typed objects for tokens
    const updatedTokens = {
      access_token: validatedData.access_token,
      refresh_token: validatedData.refresh_token,
      token_expires_at: expiresAt
    };
    
    await storage.updateIntegrationConnection(connectionId, updatedTokens);
    
  } catch (error) {
    await storage.logError(
      'GHL Token Refresh',
      error instanceof Error ? error.message : 'Unknown error refreshing GHL token',
      error instanceof Error ? error.stack : undefined,
      { connectionId }
    );
    
    throw new Error('Failed to refresh GHL token');
  }
}

// Get GHL access token (for internal use)
export async function getGHLAccessToken(): Promise<string> {
  // Using user ID 1 for now
  const userId = 1;
  const connection = await storage.getIntegrationConnection(userId, 'ghl');
  
  if (!connection || !connection.is_active) {
    throw new Error('No active GHL connection found');
  }
  
  if (!connection.access_token) {
    throw new Error('No access token found in GHL connection');
  }
  
  // Check if token is expired
  const now = new Date();
  if (connection.token_expires_at && new Date(connection.token_expires_at) < now) {
    // Ensure refresh token exists
    if (!connection.refresh_token) {
      throw new Error('No refresh token available to refresh expired access token');
    }
    
    // Refresh the token
    await refreshToken(connection.id, connection.refresh_token);
    
    // Get updated connection
    const updatedConnection = await storage.getIntegrationConnection(userId, 'ghl');
    if (!updatedConnection || !updatedConnection.access_token) {
      throw new Error('Failed to get updated GHL connection');
    }
    
    return updatedConnection.access_token;
  }
  
  return connection.access_token;
}

export default router;
