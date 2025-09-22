import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoadmapTemplate, RoadmapItem } from "@shared/schema";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import { Plus, Edit, Trash2, Eye, Calendar, Target, CheckCircle, Clock, Users } from "lucide-react";

// Form schemas
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
});

const itemFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["task", "milestone", "deliverable", "checkin", "learning"]),
  week: z.coerce.number().min(1, "Week must be at least 1"),
  orderIndex: z.coerce.number().min(0, "Order index must be 0 or greater"),
  isOptional: z.boolean().default(false),
  estimatedHours: z.coerce.number().min(1, "Estimated hours must be at least 1").optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;
type ItemFormData = z.infer<typeof itemFormSchema>;

interface TemplateWithItems extends RoadmapTemplate {
  items?: RoadmapItem[];
}

export default function AdminRoadmapManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);

  // Forms
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "task",
      week: 1,
      orderIndex: 0,
      isOptional: false,
      estimatedHours: 1,
    },
  });

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateWithItems[]>({
    queryKey: ["/api/admin/roadmap/templates"],
  });

  const { data: selectedTemplateItems = [], isLoading: itemsLoading } = useQuery<RoadmapItem[]>({
    queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`],
    enabled: !!selectedTemplate,
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await apiRequest("POST", "/api/admin/roadmap/templates", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Roadmap template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roadmap/templates"] });
      templateForm.reset();
      setIsCreateTemplateOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const response = await apiRequest("POST", `/api/admin/roadmap/templates/${selectedTemplate}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Created",
        description: "Roadmap item has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`] });
      itemForm.reset();
      setIsCreateItemOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/roadmap/items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Updated",
        description: "Roadmap item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`] });
      itemForm.reset();
      setEditingItem(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/roadmap/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Deleted",
        description: "Roadmap item has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Computed values
  const selectedTemplateData = useMemo(() => {
    return templates.find(t => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  const itemsByWeek = useMemo(() => {
    const weeks: { [key: number]: RoadmapItem[] } = {};
    selectedTemplateItems.forEach(item => {
      if (!weeks[item.week]) {
        weeks[item.week] = [];
      }
      weeks[item.week].push(item);
    });
    return weeks;
  }, [selectedTemplateItems]);

  // Event handlers
  const handleCreateTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleCreateItem = (data: ItemFormData) => {
    if (!selectedTemplate) return;
    // Add the templateId and ensure all required fields are present
    const itemData = {
      ...data,
      templateId: selectedTemplate,
    };
    createItemMutation.mutate(itemData);
  };

  const handleUpdateItem = (data: ItemFormData) => {
    if (!editingItem) return;
    updateItemMutation.mutate({ id: editingItem.id, data });
  };

  const handleEditItem = (item: RoadmapItem) => {
    setEditingItem(item);
    itemForm.setValue("title", item.title);
    itemForm.setValue("description", item.description || "");
    itemForm.setValue("type", item.type as "task" | "milestone" | "deliverable" | "checkin" | "learning");
    itemForm.setValue("week", item.week);
    itemForm.setValue("orderIndex", item.orderIndex);
    itemForm.setValue("isOptional", item.isOptional || false);
    itemForm.setValue("estimatedHours", item.estimatedHours || 1);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to delete this roadmap item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckCircle className="w-4 h-4" />;
      case "milestone": return <Target className="w-4 h-4" />;
      case "deliverable": return <Clock className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "task": return "default";
      case "milestone": return "secondary";
      case "deliverable": return "outline";
      case "checkin": return "destructive";
      case "learning": return "default";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Management Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roadmap Templates</h3>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Roadmap Template</DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., 8-Week AI Startup Accelerator"
                          data-testid="input-template-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Describe the program structure and goals..."
                          data-testid="textarea-template-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createTemplateMutation.isPending}
                  data-testid="button-submit-template"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templatesLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : templates.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground">
                Create your first roadmap template to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card 
              key={template.id} 
              className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedTemplate(template.id)}
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="w-3 h-3 mr-1" />
                    Active template
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template.id);
                    }}
                    data-testid={`button-select-template-${template.id}`}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Items Management */}
      {selectedTemplate && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedTemplateData?.name} - Items
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplateItems.length} item{selectedTemplateItems.length !== 1 ? 's' : ''} configured
                </p>
              </div>
              
              <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-item">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit Roadmap Item" : "Create Roadmap Item"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...itemForm}>
                    <form 
                      onSubmit={itemForm.handleSubmit(editingItem ? handleUpdateItem : handleCreateItem)} 
                      className="space-y-4"
                    >
                      <FormField
                        control={itemForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., Complete Market Research"
                                data-testid="input-item-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={itemForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field}
                                placeholder="Detailed description of the task or milestone..."
                                data-testid="textarea-item-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="task">Task</SelectItem>
                                  <SelectItem value="milestone">Milestone</SelectItem>
                                  <SelectItem value="deliverable">Deliverable</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={itemForm.control}
                          name="week"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Week</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="number"
                                  min="1"
                                  max="12"
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-item-week"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={itemForm.control}
                          name="orderIndex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Index</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="number"
                                  min="0"
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-item-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={editingItem ? updateItemMutation.isPending : createItemMutation.isPending}
                        data-testid="button-submit-item"
                      >
                        {editingItem ? (
                          updateItemMutation.isPending ? "Updating..." : "Update Item"
                        ) : (
                          createItemMutation.isPending ? "Creating..." : "Create Item"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : selectedTemplateItems.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="text-lg font-semibold mb-2">No Items Yet</h4>
                <p className="text-muted-foreground">
                  Add tasks, milestones, and deliverables to structure your program.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByWeek)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([week, items]) => (
                    <div key={week} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-semibold">
                          Week {week}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {items.map((item) => (
                          <Card key={item.id} className="bg-secondary/30">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {getTypeIcon(item.type)}
                                    <h5 className="font-medium" data-testid={`item-title-${item.id}`}>
                                      {item.title}
                                    </h5>
                                    <Badge 
                                      variant={getTypeColor(item.type) as any}
                                      className="text-xs"
                                    >
                                      {item.type}
                                    </Badge>
                                    {item.isOptional && (
                                      <Badge variant="outline" className="text-xs">
                                        Optional
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditItem(item)}
                                    data-testid={`button-edit-item-${item.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(item.id)}
                                    disabled={deleteItemMutation.isPending}
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}