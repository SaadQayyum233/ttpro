import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import RichTextEditor from "./RichTextEditor";

// Common schema fields
const commonSchema = {
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body_html: z.string().min(1, "Email content is required"),
  body_text: z.string().optional(),
  key_angle: z.string().optional(),
  is_active: z.boolean().default(true),
};

// Base schema
const baseSchema = z.object(commonSchema);

// Priority email schema with date validation
const prioritySchema = z.object({
  ...commonSchema,
  start_date: z.date().optional(),
  end_date: z.date().optional(),
})
.refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return data.start_date <= data.end_date;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

// Experiment email schema
const experimentSchema = z.object({
  ...commonSchema,
  base_email_id: z.number().optional(),
  description: z.string().optional(),
});

// Combined schema with conditional fields
const emailSchema = z.discriminatedUnion("type", [
  z.object({ 
    type: z.literal("template"), 
    ...commonSchema,
  }),
  z.object({ 
    type: z.literal("priority"), 
    ...commonSchema,
    start_date: z.date().optional(),
    end_date: z.date().optional(),
  }),
  z.object({ 
    type: z.literal("experiment"), 
    ...commonSchema,
    base_email_id: z.number().optional(),
    description: z.string().optional(),
  }),
]);

// Props interface
interface EmailFormProps {
  type: "template" | "priority" | "experiment";
  initialData?: any;
  onSubmit: (data: any) => void;
}

const EmailForm: React.FC<EmailFormProps> = ({ type, initialData, onSubmit }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get the appropriate schema based on the type
  const getSchema = () => {
    switch (type) {
      case "priority":
        return prioritySchema;
      case "experiment":
        return experimentSchema;
      default:
        return baseSchema;
    }
  };

  // Form initialization
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(getSchema()),
    defaultValues: initialData || {
      name: "",
      subject: "",
      body_html: "",
      body_text: "",
      key_angle: "",
      is_active: true,
      ...(type === "priority" && {
        start_date: undefined,
        end_date: undefined,
      }),
      ...(type === "experiment" && {
        base_email_id: undefined,
        description: "",
      }),
      type,
    },
  });

  const handleFormSubmit = (formData: any) => {
    // Create a copy of the data that we can safely modify
    const processedData: any = { ...formData };
    
    // Type-specific processing
    if (type === 'priority') {
      // Handle date fields for priority emails
      if (formData.start_date instanceof Date) {
        processedData.start_date = formData.start_date.toISOString();
      }
      
      if (formData.end_date instanceof Date) {
        processedData.end_date = formData.end_date.toISOString();
      }
    }
    
    // Add type if not already present
    onSubmit({ ...processedData, type });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Monthly Newsletter" {...field} />
                </FormControl>
                <FormDescription>
                  Internal name for this {type}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Line</FormLabel>
                <FormControl>
                  <Input placeholder="Your June Newsletter is here!" {...field} />
                </FormControl>
                <FormDescription>
                  Email subject that recipients will see
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="body_html"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Content</FormLabel>
              <FormControl>
                {(type === 'template' || type === 'priority') ? (
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Start composing your email..."
                  />
                ) : (
                  <Textarea
                    placeholder="<p>Hello {{name}},</p><p>Your content here...</p>"
                    className="min-h-[200px] font-mono text-sm"
                    {...field}
                  />
                )}
              </FormControl>
              <FormDescription>
                {(type === 'template' || type === 'priority') 
                  ? "Use the rich text editor to compose your email. You can insert variables like {{name}} that will be replaced with contact data."
                  : "HTML content of the email. Use {{name}} to insert recipient's name"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority-specific fields */}
        {type === "priority" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When to start sending this priority email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When to stop sending this priority email (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        {/* Experiment-specific fields */}
        {type === "experiment" && (
          <div className="w-full">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the experiment's purpose, hypothesis, and testing criteria..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about what this experiment is testing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Advanced toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="advanced-toggle"
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
          />
          <label
            htmlFor="advanced-toggle"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Show Advanced Options
          </label>
        </div>

        {/* Advanced fields */}
        {showAdvanced && (
          <>
            <Separator />
            
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="key_angle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Angle</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Urgency, scarcity, curiosity, etc." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Main persuasion angle for this email
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plain Text Version</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hello {{name}}, Your content here..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Plain text alternative for email clients that don't support HTML
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        If unchecked, this email will not be used in automated workflows
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <Button type="submit">
            {initialData ? "Update" : "Create"} {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EmailForm;
