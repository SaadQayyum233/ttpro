import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import EmailForm from "@/components/email/EmailForm";
import PriorityEmailControls from "@/components/email/PriorityEmailControls";
import ExperimentControls from "@/components/email/ExperimentControls";
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Send,
  FlaskRound,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  MoreHorizontal,
  FileText,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define interface for email data
interface Email {
  id: number;
  type: 'template' | 'priority' | 'experiment' | 'sent';
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  key_angle?: string;
  version: number;
  base_email_id?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  description?: string; // Additional field for experiments
}

// Define interface for experiment variant data
interface ExperimentVariant {
  id: number;
  email_id: number;
  variant_letter: string;
  subject: string;
  body_html: string;
  body_text?: string;
  key_angle?: string;
  ai_parameters: Record<string, any>;
  created_at: string;
}

const EmailsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [createVariantsOpen, setCreateVariantsOpen] = useState(false);
  const [deleteEmailId, setDeleteEmailId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailType, setEmailType] = useState<'template' | 'priority' | 'experiment'>('template');
  
  // Helper function to ensure email type is valid for the form
  const getValidEmailType = (type: string): 'template' | 'priority' | 'experiment' => {
    if (type === 'template' || type === 'priority' || type === 'experiment') {
      return type;
    }
    return 'template'; // Default to template if type is invalid
  };
  const [subjectFilter, setSubjectFilter] = useState("");
  const { toast } = useToast();

  // Fetch emails data
  const { data: emailsData = [], isLoading, isError } = useQuery<Email[]>({
    queryKey: ['/api/emails'],
  });

  // Get columns for the current tab
  const getColumnsForTab = (tabType: string): ColumnDef<Email>[] => {
    // Get base columns that apply to all tabs
    const baseColumns: ColumnDef<Email>[] = [
      {
        accessorKey: "id",
        header: "ID",
      },
      {
        accessorKey: "name",
        header: "Name", 
        cell: ({ row }) => {
          const email = row.original;
          return (
            <div className="flex items-center gap-2">
              <span>{email.name}</span>
              {email.version > 1 && (
                <Badge variant="outline" className="ml-1">v{email.version}</Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "subject",
        header: "Subject",
      },
      {
        accessorKey: "created_at",
        header: "Created Date",
        cell: ({ row }) => {
          const created = row.getValue("created_at") as string;
          return <span>{new Date(created).toLocaleDateString()}</span>;
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated Date",
        cell: ({ row }) => {
          const updated = row.getValue("updated_at") as string;
          return <span>{new Date(updated).toLocaleDateString()}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const email = row.original;
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEditEmail(email)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Create a copy with a temporary id for duplication
                    const emailCopy = {
                      ...email,
                      id: -1, // Temporary ID that will be replaced when saved
                      name: `${email.name} (Copy)`,
                    };
                    setSelectedEmail(emailCopy);
                    setEmailType(getValidEmailType(email.type));
                    setIsEditOpen(true);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                
                {email.type === 'priority' && (
                  <DropdownMenuItem onClick={() => handleSendEmail(email)}>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </DropdownMenuItem>
                )}
                
                {email.type === 'experiment' && (
                  <DropdownMenuItem onClick={() => handleCreateVariants(email)}>
                    <FlaskRound className="mr-2 h-4 w-4" />
                    Generate Variants
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteEmailId(email.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
    
    // Tab-specific columns
    if (tabType === 'all') {
      // For "All Emails" tab - sent emails
      return [
        ...baseColumns,
        {
          accessorKey: "type",
          header: "Type",
          cell: ({ row }) => {
            const type = row.getValue("type") as string;
            return (
              <Badge variant="default">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Badge>
            );
          },
        },
      ];
    } else if (tabType === 'template') {
      // For "Templates" tab
      return [
        ...baseColumns,
        {
          accessorKey: "version",
          header: "Version",
        },
        {
          accessorKey: "key_angle",
          header: "Key Angle",
          cell: ({ row }) => {
            const keyAngle = row.getValue("key_angle") as string | undefined;
            return keyAngle ? keyAngle : <span className="text-muted-foreground text-sm">—</span>;
          },
        },
        {
          accessorKey: "is_active",
          header: "Status",
          cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean;
            return (
              <div className="flex items-center">
                {isActive ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Inactive</span>
                  </>
                )}
              </div>
            );
          },
        },
      ];
    } else if (tabType === 'priority') {
      // For "Priority" tab
      return [
        ...baseColumns,
        {
          accessorKey: "version",
          header: "Version",
        },
        {
          accessorKey: "key_angle",
          header: "Key Angle",
          cell: ({ row }) => {
            const keyAngle = row.getValue("key_angle") as string | undefined;
            return keyAngle ? keyAngle : <span className="text-muted-foreground text-sm">—</span>;
          },
        },
        {
          accessorKey: "start_date",
          header: "Schedule",
          cell: ({ row }) => {
            const email = row.original;
            if (!email.start_date) {
              return <span className="text-muted-foreground text-sm">—</span>;
            }
            
            const start = new Date(email.start_date);
            const end = email.end_date ? new Date(email.end_date) : null;
            const now = new Date();
            
            let status;
            if (now < start) {
              status = "Scheduled";
            } else if (!end || now <= end) {
              status = "Active";
            } else {
              status = "Ended";
            }
            
            return (
              <div className="flex items-center gap-2">
                <Badge variant={
                  status === 'Active' ? 'default' :
                  status === 'Scheduled' ? 'outline' :
                  'secondary'
                }>
                  {status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {start.toLocaleDateString()}
                  {end ? ` - ${end.toLocaleDateString()}` : ''}
                </span>
              </div>
            );
          },
        },
        {
          accessorKey: "is_active",
          header: "Status",
          cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean;
            return (
              <div className="flex items-center">
                {isActive ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Inactive</span>
                  </>
                )}
              </div>
            );
          },
        },
      ];
    } else if (tabType === 'experiment') {
      // For "Experiments" tab
      return [
        ...baseColumns,
        {
          accessorKey: "version",
          header: "Version",
        },
        {
          accessorKey: "key_angle",
          header: "Key Angle",
          cell: ({ row }) => {
            const keyAngle = row.getValue("key_angle") as string | undefined;
            return keyAngle ? keyAngle : <span className="text-muted-foreground text-sm">—</span>;
          },
        },
        {
          accessorKey: "description",
          header: "Description",
          cell: ({ row }) => {
            const description = row.getValue("description") as string | undefined;
            return description ? description : <span className="text-muted-foreground text-sm">—</span>;
          },
        },
        {
          accessorKey: "is_active",
          header: "Status",
          cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean;
            return (
              <div className="flex items-center">
                {isActive ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Inactive</span>
                  </>
                )}
              </div>
            );
          },
        },
      ];
    }
    
    // Default to base columns
    return baseColumns;
  };

  // Filter emails based on active tab and subject search
  const filteredEmails = useMemo(() => {
    if (!emailsData) return [];
    
    return emailsData.filter(email => {
      // All Emails tab should only show 'sent' type emails
      if (activeTab === 'all') {
        return email.type === 'sent';
      }
      
      // Other tabs should show emails of their specific type
      if (email.type !== activeTab) return false;
      
      // Filter by subject search
      if (subjectFilter && !email.subject.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
      
      return true;
    });
  }, [emailsData, activeTab, subjectFilter]);

  // Handle email deletion
  const handleDeleteEmail = async () => {
    if (!deleteEmailId) return;
    
    try {
      await apiRequest("DELETE", `/api/emails/${deleteEmailId}`);
      
      toast({
        title: "Email deleted",
        description: "The email has been successfully removed.",
      });
      
      // Refresh emails list
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
    } catch (error) {
      toast({
        title: "Failed to delete email",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
    
    setDeleteEmailId(null);
  };

  // Set selected email for editing
  const handleEditEmail = (email: Email) => {
    setSelectedEmail(email);
    setEmailType(getValidEmailType(email.type));
    setIsEditOpen(true);
  };

  // Prepare for email sending
  const handleSendEmail = (email: Email) => {
    setSelectedEmail(email);
    setSendEmailOpen(true);
  };

  // Prepare for variant creation
  const handleCreateVariants = (email: Email) => {
    setSelectedEmail(email);
    setCreateVariantsOpen(true);
  };

  // Table columns definition - Comprehensive view showing all fields
  const columns: ColumnDef<Email>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Name", 
      cell: ({ row }) => {
        const email = row.original;
        return (
          <div className="flex items-center gap-2">
            <span>{email.name}</span>
            {email.version > 1 && (
              <Badge variant="outline" className="ml-1">v{email.version}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={
            type === 'template' ? 'outline' :
            type === 'priority' ? 'default' :
            'secondary'
          }>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
    },
    {
      accessorKey: "version",
      header: "Version",
    },
    {
      accessorKey: "key_angle",
      header: "Key Angle",
      cell: ({ row }) => {
        const keyAngle = row.getValue("key_angle") as string | undefined;
        return keyAngle ? keyAngle : <span className="text-muted-foreground text-sm">—</span>;
      },
    },

    {
      accessorKey: "start_date",
      header: "Schedule",
      cell: ({ row }) => {
        const email = row.original;
        if (email.type !== 'priority' || !email.start_date) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        
        const start = new Date(email.start_date);
        const end = email.end_date ? new Date(email.end_date) : null;
        const now = new Date();
        
        let status;
        if (now < start) {
          status = "Scheduled";
        } else if (!end || now <= end) {
          status = "Active";
        } else {
          status = "Ended";
        }
        
        return (
          <div className="flex items-center gap-2">
            <Badge variant={
              status === 'Active' ? 'default' :
              status === 'Scheduled' ? 'outline' :
              'secondary'
            }>
              {status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {start.toLocaleDateString()}
              {end ? ` - ${end.toLocaleDateString()}` : ''}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      cell: ({ row }) => {
        const endDate = row.getValue("end_date") as string | undefined;
        return endDate ? new Date(endDate).toLocaleDateString() : <span className="text-muted-foreground text-sm">—</span>;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <div className="flex items-center">
            {isActive ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                <span>Active</span>
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                <span>Inactive</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => {
        const created = row.getValue("created_at") as string;
        return <span>{new Date(created).toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated Date",
      cell: ({ row }) => {
        const updated = row.getValue("updated_at") as string;
        return <span>{new Date(updated).toLocaleDateString()}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const email = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditEmail(email)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Create a copy with a temporary id for duplication
                  const emailCopy = {
                    ...email,
                    id: -1, // Temporary ID that will be replaced when saved
                    name: `${email.name} (Copy)`,
                  };
                  setSelectedEmail(emailCopy);
                  setEmailType(getValidEmailType(email.type));
                  setIsEditOpen(true);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              
              {email.type === 'priority' && (
                <DropdownMenuItem onClick={() => handleSendEmail(email)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </DropdownMenuItem>
              )}
              
              {email.type === 'experiment' && (
                <DropdownMenuItem onClick={() => handleCreateVariants(email)}>
                  <FlaskRound className="mr-2 h-4 w-4" />
                  Generate Variants
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteEmailId(email.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Failed to load emails</h2>
          <p className="text-muted-foreground mb-6">
            There was an error loading your emails. Please try again.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/emails'] })}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Emails</h1>
          <p className="text-muted-foreground">
            Manage templates, priority emails, and experiments
          </p>
        </div>
        {activeTab !== 'all' && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Create Email</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Email</DialogTitle>
              </DialogHeader>
              
              {activeTab === 'template' && (
                <EmailForm 
                  type="template"
                  onSubmit={async (data) => {
                    try {
                      await apiRequest("POST", "/api/emails", {
                        ...data,
                        type: "template"
                      });
                      
                      toast({
                        title: "Template created",
                        description: "Email template has been created successfully.",
                      });
                      
                      setIsCreateOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                    } catch (error) {
                      toast({
                        title: "Failed to create template",
                        description: error instanceof Error ? error.message : "An error occurred",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}
              
              {activeTab === 'priority' && (
                <EmailForm 
                  type="priority"
                  onSubmit={async (data) => {
                    try {
                      await apiRequest("POST", "/api/emails", {
                        ...data,
                        type: "priority"
                      });
                      
                      toast({
                        title: "Priority email created",
                        description: "Priority email has been created successfully.",
                      });
                      
                      setIsCreateOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                    } catch (error) {
                      toast({
                        title: "Failed to create priority email",
                        description: error instanceof Error ? error.message : "An error occurred",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}
              
              {activeTab === 'experiment' && (
                <EmailForm 
                  type="experiment"
                  onSubmit={async (data) => {
                    try {
                      await apiRequest("POST", "/api/emails", {
                        ...data,
                        type: "experiment"
                      });
                      
                      toast({
                        title: "Experiment created",
                        description: "Email experiment has been created successfully.",
                      });
                      
                      setIsCreateOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                    } catch (error) {
                      toast({
                        title: "Failed to create experiment",
                        description: error instanceof Error ? error.message : "An error occurred",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Emails</TabsTrigger>
          <TabsTrigger value="template">Templates</TabsTrigger>
          <TabsTrigger value="priority">Priority</TabsTrigger>
          <TabsTrigger value="experiment">Experiments</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Custom search bar */}
      <div className="relative max-w-md w-full mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="pl-8"
        />
      </div>
      
      {/* Data table with hidden global filter */}
      <DataTable 
        columns={getColumnsForTab(activeTab)} 
        data={filteredEmails} 
        filterPlaceholder="" 
        hideGlobalFilter={true}
      />

      {/* Edit Email Dialog */}
      {selectedEmail && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Email</DialogTitle>
              <DialogDescription>
                Update {emailType === 'template' ? 'template' : 
                        emailType === 'priority' ? 'priority' : 
                        'experiment'} email settings
              </DialogDescription>
            </DialogHeader>
            
            <EmailForm 
              type={emailType}
              initialData={selectedEmail}
              onSubmit={async (data) => {
                try {
                  await apiRequest("PUT", `/api/emails/${selectedEmail.id}`, {
                    ...data,
                    type: emailType
                  });
                  
                  toast({
                    title: "Email updated",
                    description: "Email has been updated successfully.",
                  });
                  
                  setIsEditOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                } catch (error) {
                  toast({
                    title: "Failed to update email",
                    description: error instanceof Error ? error.message : "An error occurred",
                    variant: "destructive",
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Send Priority Email Dialog */}
      {selectedEmail && (
        <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Priority Email</DialogTitle>
              <DialogDescription>
                Send "{selectedEmail.name}" to contacts with specific tag
              </DialogDescription>
            </DialogHeader>
            
            <PriorityEmailControls 
              email={selectedEmail}
              onSend={async (tag) => {
                try {
                  const response = await apiRequest("POST", `/api/emails/${selectedEmail.id}/send`, { tag });
                  
                  toast({
                    title: "Email sending in progress",
                    description: `Sending to contacts with tag: ${tag}`,
                  });
                  
                  setSendEmailOpen(false);
                } catch (error) {
                  toast({
                    title: "Failed to send email",
                    description: error instanceof Error ? error.message : "An error occurred",
                    variant: "destructive",
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Create Experiment Variants Dialog */}
      {selectedEmail && (
        <Dialog open={createVariantsOpen} onOpenChange={setCreateVariantsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Email Variants</DialogTitle>
              <DialogDescription>
                Create AI-powered variations of "{selectedEmail.name}"
              </DialogDescription>
            </DialogHeader>
            
            <ExperimentControls 
              email={selectedEmail}
              onGenerate={async (count) => {
                try {
                  await apiRequest("POST", `/api/emails/${selectedEmail.id}/generate-variants`, { count });
                  
                  toast({
                    title: "Variants generated",
                    description: `Created ${count} variations of your email.`,
                  });
                  
                  setCreateVariantsOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                } catch (error) {
                  toast({
                    title: "Failed to generate variants",
                    description: error instanceof Error ? error.message : "An error occurred",
                    variant: "destructive",
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteEmailId !== null} onOpenChange={(open) => !open && setDeleteEmailId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              email and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmail} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailsPage;
