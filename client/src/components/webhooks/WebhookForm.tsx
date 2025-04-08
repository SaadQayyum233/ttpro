import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Webhook } from "./WebhookManager";

const webhookSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  type: z.enum(["incoming", "outgoing"]),
  provider: z.string().min(1, { message: "Provider is required" }),
  is_active: z.boolean().default(true),
  
  // Fields for incoming webhooks
  endpoint_token: z.string().optional(),
  secret_key: z.string().optional(),
  notification_email: z.string().email().optional().or(z.literal('')),
  event_handling: z.array(z.string()).optional(),
  
  // Fields for outgoing webhooks
  trigger_event: z.string().optional(),
  target_url: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  http_method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  selected_fields: z.array(z.string()).optional(),
  payload_template: z.string().optional(),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

interface WebhookFormProps {
  existingWebhook: Webhook | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export function WebhookForm({ existingWebhook, onSaveSuccess, onCancel }: WebhookFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!existingWebhook?.id;
  const webhookType = existingWebhook?.type || 'incoming';
  
  const defaultValues: Partial<WebhookFormValues> = {
    name: existingWebhook?.name || "",
    description: existingWebhook?.description || "",
    type: (existingWebhook?.type as "incoming" | "outgoing") || "incoming",
    provider: existingWebhook?.provider || "",
    is_active: existingWebhook?.is_active ?? true,
    
    // Incoming webhook fields
    endpoint_token: existingWebhook?.endpoint_token || "",
    secret_key: existingWebhook?.secret_key || "",
    notification_email: existingWebhook?.notification_email || "",
    event_handling: existingWebhook?.event_handling || [],
    
    // Outgoing webhook fields
    trigger_event: existingWebhook?.trigger_event || "",
    target_url: existingWebhook?.target_url || "",
    http_method: (existingWebhook?.http_method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH") || "POST",
    headers: existingWebhook?.headers || {},
    selected_fields: existingWebhook?.selected_fields || [],
    payload_template: existingWebhook?.payload_template || "",
  };

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues,
  });

  const onSubmit = async (values: WebhookFormValues) => {
    setIsSaving(true);
    try {
      if (isEditing && existingWebhook?.id) {
        await apiRequest("PUT", `/api/webhooks/${existingWebhook.id}`, values);
        toast({
          title: "Webhook updated",
          description: "Your webhook has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/webhooks", values);
        toast({
          title: "Webhook created",
          description: "Your new webhook has been created successfully.",
        });
      }
      onSaveSuccess();
    } catch (error) {
      toast({
        title: "Error saving webhook",
        description: error instanceof Error ? error.message : "Failed to save webhook",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentType = form.watch("type");

  return (
    <Dialog open={true} onOpenChange={() => !isSaving && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Webhook" : "Create New Webhook"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="custom, ghl, etc." 
                        {...field} 
                        disabled={isEditing} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the purpose of this webhook" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Type</FormLabel>
                  <FormControl>
                    <Select 
                      disabled={isEditing} 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incoming">Incoming Webhook</SelectItem>
                        <SelectItem value="outgoing">Outgoing Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {currentType === "incoming" 
                      ? "Receives data from external systems" 
                      : "Sends data to external systems"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      {field.value ? "This webhook is active and will process data" : "This webhook is inactive"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {currentType === "incoming" ? (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="endpoint_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint Token</FormLabel>
                      <FormControl>
                        <Input placeholder="unique-endpoint-token" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be part of your webhook URL: /api/webhooks/incoming/{field.value || "token"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secret_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Key</FormLabel>
                      <FormControl>
                        <Input placeholder="your-secret-key" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used to validate the authenticity of incoming webhook requests
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notification_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Receive notifications when this webhook is triggered
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="trigger_event"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Event</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contact.created">Contact Created</SelectItem>
                            <SelectItem value="contact.updated">Contact Updated</SelectItem>
                            <SelectItem value="contact.deleted">Contact Deleted</SelectItem>
                            <SelectItem value="tag.added">Tag Added</SelectItem>
                            <SelectItem value="tag.removed">Tag Removed</SelectItem>
                            <SelectItem value="email.sent">Email Sent</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        The event that will trigger this webhook
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-endpoint.com/webhook" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL that will receive the webhook data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="http_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HTTP Method</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payload_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payload Template (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='{
  "contact": {
    "id": "{{contact.id}}",
    "email": "{{contact.email}}",
    "name": "{{contact.name}}"
  },
  "event": "{{event}}"
}' 
                          className="min-h-[200px] font-mono" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Use &#123;&#123;variable&#125;&#125; syntax for dynamic data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Webhook"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}