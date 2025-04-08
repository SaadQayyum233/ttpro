import React from "react";
import { WebhookManager } from "@/components/webhooks/WebhookManager";
import { PageHeader } from "@/components/ui/page-header";

const WebhooksPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <PageHeader title="Webhooks" description="Manage your webhooks for third-party integrations" />
      <div className="mt-6">
        <WebhookManager />
      </div>
    </div>
  );
};

export default WebhooksPage;