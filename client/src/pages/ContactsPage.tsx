import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ColumnDef, 
  ColumnFiltersState 
} from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Tag as TagIcon,
  X,
  MoreHorizontal,
  Mail,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from "@/lib/queryClient";

// Define contact schema for form validation
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  tags: z.string().optional(),
  contact_source: z.string().optional(),
  last_email_sequence: z.number().optional(),
});

// Define interface for contact data
interface Contact {
  id: number;
  ghl_id?: string;
  email: string;
  name: string;
  tags: string[];
  custom_fields?: Record<string, any>;
  last_email_sequence?: number;
  contact_source?: string;
  created_at: string;
  updated_at: string;
}

const ContactsPage = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
  const [emailFilter, setEmailFilter] = useState("");
  const { toast } = useToast();

  // Fetch contacts data
  const { data: contactsData, isLoading, isError } = useQuery<Contact[]>({
    queryKey: ['/api/contacts']
  });
  
  // Filter contacts by email
  const contacts = useMemo(() => {
    if (!contactsData) return [];
    if (!emailFilter) return contactsData;
    
    return contactsData.filter(contact => 
      contact.email.toLowerCase().includes(emailFilter.toLowerCase())
    );
  }, [contactsData, emailFilter]);

  // Form handling
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      tags: "",
      contact_source: "manual",
      last_email_sequence: 0,
    },
  });

  const tagForm = useForm({
    defaultValues: {
      tag: "",
    },
  });

  // Reset form on dialog close
  const handleDialogChange = (open: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!open) {
      form.reset();
      tagForm.reset();
    }
    setter(open);
  };

  // Set form values when editing a contact
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    form.reset({
      name: contact.name,
      email: contact.email,
      tags: contact.tags?.join(", ") || "",
      contact_source: contact.contact_source || "manual",
      last_email_sequence: contact.last_email_sequence || 0,
    });
    setIsEditOpen(true);
  };

  // Handle contact deletion
  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    
    try {
      await apiRequest("DELETE", `/api/contacts/${deleteContactId}`);
      
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully removed.",
      });
      
      // Refresh contacts list
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    } catch (error) {
      toast({
        title: "Failed to delete contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
    
    setDeleteContactId(null);
  };

  // Create new contact
  const onCreateSubmit = async (data: z.infer<typeof contactSchema>) => {
    try {
      // Convert comma-separated tags to array
      const tagsArray = data.tags ? data.tags.split(",").map(tag => tag.trim()) : [];
      
      // Set empty object for custom fields
      const customFields = {};
      
      await apiRequest("POST", "/api/contacts", {
        name: data.name,
        email: data.email,
        tags: tagsArray,
        contact_source: data.contact_source || "manual",
        custom_fields: customFields,
        last_email_sequence: data.last_email_sequence || 0,
      });
      
      toast({
        title: "Contact created",
        description: "New contact has been added successfully.",
      });
      
      setIsCreateOpen(false);
      form.reset();
      
      // Refresh contacts list
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    } catch (error) {
      toast({
        title: "Failed to create contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Update existing contact
  const onUpdateSubmit = async (data: z.infer<typeof contactSchema>) => {
    if (!selectedContact) return;
    
    try {
      // Convert comma-separated tags to array
      const tagsArray = data.tags ? data.tags.split(",").map(tag => tag.trim()) : [];
      
      // Set empty object for custom fields
      const customFields = {};
      
      await apiRequest("PUT", `/api/contacts/${selectedContact.id}`, {
        name: data.name,
        email: data.email,
        tags: tagsArray,
        contact_source: data.contact_source,
        custom_fields: customFields,
        last_email_sequence: data.last_email_sequence,
      });
      
      toast({
        title: "Contact updated",
        description: "Contact information has been updated successfully.",
      });
      
      setIsEditOpen(false);
      form.reset();
      
      // Refresh contacts list
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    } catch (error) {
      toast({
        title: "Failed to update contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Add/Remove tag
  const handleTagAction = async (action: 'add' | 'remove') => {
    if (!selectedContact) return;
    
    try {
      const tag = tagForm.getValues().tag.trim();
      
      if (!tag) {
        toast({
          title: "Tag is required",
          description: "Please enter a tag name.",
          variant: "destructive",
        });
        return;
      }
      
      await apiRequest("PUT", `/api/contacts/${selectedContact.id}/tags`, {
        action,
        tag,
      });
      
      toast({
        title: action === 'add' ? "Tag added" : "Tag removed",
        description: `Tag has been ${action === 'add' ? 'added to' : 'removed from'} the contact.`,
      });
      
      setIsTagOpen(false);
      tagForm.reset();
      
      // Refresh contacts list
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    } catch (error) {
      toast({
        title: `Failed to ${action} tag`,
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Table columns definition
  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {tags && tags.length > 0 ? (
              tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="max-w-[120px] truncate">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">No tags</span>
            )}
            {tags && tags.length > 3 && (
              <Badge variant="outline">+{tags.length - 3} more</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "custom_fields",
      header: "Custom Fields",
      cell: ({ row }) => {
        const customFields = row.getValue("custom_fields") as Record<string, any>;
        if (!customFields || Object.keys(customFields).length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return (
          <span className="text-xs">
            {Object.keys(customFields).length} field(s)
          </span>
        );
      },
    },
    {
      accessorKey: "last_email_sequence",
      header: "Last Sequence",
      cell: ({ row }) => {
        const sequence = row.getValue("last_email_sequence") as number;
        return sequence ? (
          <span>{sequence}</span>
        ) : (
          <span className="text-muted-foreground text-sm">0</span>
        );
      },
    },
    {
      accessorKey: "contact_source",
      header: "Source",
    },
    {
      accessorKey: "ghl_id",
      header: "GHL ID",
      cell: ({ row }) => {
        const ghlId = row.getValue("ghl_id") as string;
        return ghlId ? (
          <span className="font-mono text-xs">{ghlId.substring(0, 8)}...</span>
        ) : (
          <span className="text-muted-foreground text-sm">Not synced</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const created = row.getValue("created_at") as string;
        return <span>{new Date(created).toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => {
        const updated = row.getValue("updated_at") as string;
        return <span>{new Date(updated).toLocaleDateString()}</span>;
      },
    },
    // Actions column - positioned as the rightmost column
    {
      id: "actions",
      header: "Actions",
      // Make this column not hideable and always visible
      enableHiding: false,
      cell: ({ row }) => {
        const contact = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedContact(contact);
                  setIsTagOpen(true);
                }}
              >
                <TagIcon className="mr-2 h-4 w-4" />
                Manage Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteContactId(contact.id)}
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
          <h2 className="text-2xl font-bold mb-2">Failed to load contacts</h2>
          <p className="text-muted-foreground mb-6">
            There was an error loading the contacts. Please try again.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/contacts'] })}
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
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact list and tags
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => handleDialogChange(open, setIsCreateOpen)}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Contact</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Contact</DialogTitle>
              <DialogDescription>
                Add a new contact to your database
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="lead, customer, priority" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Source</FormLabel>
                      <FormControl>
                        <Input placeholder="manual, import, signup" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_email_sequence"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Last Email Sequence</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={value !== undefined ? value.toString() : '0'} 
                          onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Create Contact</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Custom search bar */}
      <div className="relative max-w-md w-full mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Email"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          className="pl-8"
        />
      </div>
      
      {/* Data table with hidden global filter */}
      <DataTable 
        columns={columns} 
        data={contacts || []} 
        filterPlaceholder="" 
        hideGlobalFilter={true}
      />

      {/* Edit Contact Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => handleDialogChange(open, setIsEditOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma separated)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Source</FormLabel>
                    <FormControl>
                      <Input placeholder="manual, import, signup" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_email_sequence"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Last Email Sequence</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={value !== undefined ? value.toString() : '0'} 
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Update Contact</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Tags Dialog */}
      <Dialog open={isTagOpen} onOpenChange={(open) => handleDialogChange(open, setIsTagOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags for {selectedContact?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <Label>Current Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedContact?.tags && selectedContact.tags.length > 0 ? (
                selectedContact.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={async () => {
                        tagForm.setValue("tag", tag);
                        await handleTagAction("remove");
                      }} 
                    />
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No tags</span>
              )}
            </div>
          </div>
          
          <Tabs defaultValue="add">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Tag</TabsTrigger>
              <TabsTrigger value="remove">Remove Tag</TabsTrigger>
            </TabsList>
            <TabsContent value="add" className="mt-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTagAction("add");
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1">
                  <Label htmlFor="add-tag">Tag Name</Label>
                  <Input 
                    id="add-tag"
                    placeholder="Enter tag name" 
                    {...tagForm.register("tag")}
                  />
                </div>
                <Button type="submit">Add</Button>
              </form>
            </TabsContent>
            <TabsContent value="remove" className="mt-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTagAction("remove");
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1">
                  <Label htmlFor="remove-tag">Tag Name</Label>
                  <Input 
                    id="remove-tag"
                    placeholder="Enter tag name" 
                    {...tagForm.register("tag")}
                    list="current-tags"
                  />
                  <datalist id="current-tags">
                    {selectedContact?.tags?.map((tag, i) => (
                      <option key={i} value={tag} />
                    ))}
                  </datalist>
                </div>
                <Button type="submit" variant="destructive">Remove</Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteContactId !== null} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              contact and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactsPage;
