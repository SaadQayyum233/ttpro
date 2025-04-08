import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { Webhook } from "./WebhookManager";
import { formatDistanceToNow } from "date-fns";

interface WebhookTableProps {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
}

export function WebhookTable({ webhooks, onEdit, onDelete }: WebhookTableProps) {
  if (webhooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No webhooks found. Create one to get started.
      </div>
    );
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Never";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="w-full overflow-auto max-h-[600px]">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[180px]">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {webhooks.map((webhook) => (
            <TableRow key={webhook.id}>
              <TableCell className="font-medium">{webhook.name}</TableCell>
              <TableCell>
                <Badge variant={webhook.type === 'incoming' ? 'secondary' : 'default'}>
                  {webhook.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                </Badge>
              </TableCell>
              <TableCell>{webhook.provider}</TableCell>
              <TableCell>
                <Badge variant={webhook.is_active ? 'default' : 'destructive'} className={webhook.is_active ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {webhook.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>{formatTimestamp(webhook.updated_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(webhook)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onDelete(webhook)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}