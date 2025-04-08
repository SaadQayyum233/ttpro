import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import { WebhookTable } from "./WebhookTable";
import { WebhookForm } from "./WebhookForm";

export interface Webhook {
  id?: number;
  user_id?: number;
  type: 'incoming' | 'outgoing';
  name: string;
  description?: string;
  provider: string;
  endpoint_token?: string;
  secret_key?: string;
  event_handling?: string[];
  notification_email?: string;
  trigger_event?: string;
  target_url?: string;
  http_method?: string;
  headers?: Record<string, string>;
  selected_fields?: string[];
  payload_template?: string;
  is_active: boolean;
  last_triggered?: string;
  created_at?: string;
  updated_at?: string;
}

export function WebhookManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/webhooks");
      if (Array.isArray(response)) {
        setWebhooks(response);
      } else {
        console.error("Unexpected response format:", response);
        setWebhooks([]);
      }
    } catch (error) {
      toast({
        title: "Error fetching webhooks",
        description: error instanceof Error ? error.message : "Failed to load webhooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreateWebhook = (type: 'incoming' | 'outgoing') => {
    setSelectedWebhook({
      type,
      name: "",
      provider: "",
      is_active: true,
    });
    setFormOpen(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setFormOpen(true);
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!webhook.id) return;

    try {
      await apiRequest("DELETE", `/api/webhooks/${webhook.id}`);
      toast({
        title: "Webhook deleted",
        description: "The webhook has been successfully deleted.",
      });
      fetchWebhooks();
    } catch (error) {
      toast({
        title: "Failed to delete webhook",
        description: error instanceof Error ? error.message : "An error occurred while deleting the webhook",
        variant: "destructive",
      });
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedWebhook(null);
  };

  const handleFormSuccess = () => {
    fetchWebhooks();
    setFormOpen(false);
    setSelectedWebhook(null);
  };

  const filteredWebhooks = activeTab === "all" 
    ? webhooks 
    : webhooks.filter((webhook) => webhook.type === activeTab);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All Webhooks</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={() => handleCreateWebhook('incoming')} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Incoming Webhook
            </Button>
            <Button onClick={() => handleCreateWebhook('outgoing')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Outgoing Webhook
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-8">Loading webhooks...</div>
              ) : (
                <WebhookTable 
                  webhooks={filteredWebhooks}
                  onEdit={handleEditWebhook}
                  onDelete={handleDeleteWebhook}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-8">Loading webhooks...</div>
              ) : (
                <WebhookTable 
                  webhooks={filteredWebhooks}
                  onEdit={handleEditWebhook}
                  onDelete={handleDeleteWebhook}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-8">Loading webhooks...</div>
              ) : (
                <WebhookTable 
                  webhooks={filteredWebhooks}
                  onEdit={handleEditWebhook}
                  onDelete={handleDeleteWebhook}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {formOpen && (
        <WebhookForm
          existingWebhook={selectedWebhook}
          onSaveSuccess={handleFormSuccess}
          onCancel={handleFormClose}
        />
      )}
    </div>
  );
}