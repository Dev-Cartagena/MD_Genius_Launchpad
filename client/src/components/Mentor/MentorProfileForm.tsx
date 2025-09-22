import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, X, Star, Clock, Users, Save, CheckCircle } from "lucide-react";
import type { MentorProfile } from "@shared/schema";

// Mentor Profile Form Schema
const mentorProfileSchema = z.object({
  expertise: z.array(z.string()).min(1, "Please select at least one area of expertise"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must not exceed 500 characters"),
  industries: z.array(z.string()).min(1, "Please select at least one industry"),
  availability: z.array(z.string()).min(1, "Please select your availability"),
  isActive: z.boolean().default(true),
});

type MentorProfileFormData = z.infer<typeof mentorProfileSchema>;

interface MentorProfileFormProps {
  onComplete?: () => void;
  isEditing?: boolean;
}

// Pre-defined options
const expertiseOptions = [
  "AI/Machine Learning",
  "Product Strategy",
  "Software Engineering",
  "Data Science",
  "Business Development",
  "Marketing & Growth",
  "Fundraising",
  "Legal & Compliance",
  "UX/UI Design",
  "Operations",
  "Sales",
  "Leadership"
];

const industryOptions = [
  "Healthcare",
  "Fintech",
  "EdTech",
  "E-commerce",
  "SaaS",
  "Cybersecurity",
  "Climate Tech",
  "Web3/Blockchain",
  "Robotics",
  "IoT",
  "Gaming",
  "Media & Entertainment"
];

const availabilityOptions = [
  "Weekday Mornings",
  "Weekday Afternoons", 
  "Weekday Evenings",
  "Weekend Mornings",
  "Weekend Afternoons",
  "Weekend Evenings",
  "Flexible Schedule"
];

export default function MentorProfileForm({ onComplete, isEditing = false }: MentorProfileFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customExpertise, setCustomExpertise] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");

  // Fetch existing mentor profile if editing
  const { data: existingProfile, isLoading: profileLoading } = useQuery<MentorProfile>({
    queryKey: ['/api/mentor/profile'],
    enabled: isEditing && !!user,
  });

  const form = useForm<MentorProfileFormData>({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: {
      expertise: existingProfile?.expertise || [],
      bio: existingProfile?.bio || "",
      industries: existingProfile?.industries || [],
      availability: (existingProfile?.availability as string[]) || [],
      isActive: existingProfile?.isActive ?? true,
    },
  });

  // Reset form when existing profile loads
  useEffect(() => {
    if (existingProfile && isEditing) {
      form.reset({
        expertise: existingProfile.expertise || [],
        bio: existingProfile.bio || "",
        industries: existingProfile.industries || [],
        availability: (existingProfile.availability as string[]) || [],
        isActive: existingProfile.isActive ?? true,
      });
    }
  }, [existingProfile, isEditing, form]);

  // Create mutation
  const createProfile = useMutation({
    mutationFn: (data: MentorProfileFormData) => 
      apiRequest('POST', '/api/mentor/profile', data),
    onSuccess: () => {
      toast({
        title: "Profile Created!",
        description: "Your mentor profile has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mentor/profile'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateProfile = useMutation({
    mutationFn: (data: MentorProfileFormData) => 
      apiRequest('PUT', '/api/mentor/profile', data),
    onSuccess: () => {
      toast({
        title: "Profile Updated!",
        description: "Your mentor profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mentor/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mentors'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MentorProfileFormData) => {
    if (isEditing) {
      updateProfile.mutate(data);
    } else {
      createProfile.mutate(data);
    }
  };

  const addCustomExpertise = () => {
    if (customExpertise.trim()) {
      const currentExpertise = form.getValues("expertise");
      if (!currentExpertise.includes(customExpertise.trim())) {
        form.setValue("expertise", [...currentExpertise, customExpertise.trim()]);
      }
      setCustomExpertise("");
    }
  };

  const addCustomIndustry = () => {
    if (customIndustry.trim()) {
      const currentIndustries = form.getValues("industries");
      if (!currentIndustries.includes(customIndustry.trim())) {
        form.setValue("industries", [...currentIndustries, customIndustry.trim()]);
      }
      setCustomIndustry("");
    }
  };

  const removeExpertise = (expertiseToRemove: string) => {
    const currentExpertise = form.getValues("expertise");
    form.setValue("expertise", currentExpertise.filter(e => e !== expertiseToRemove));
  };

  const removeIndustry = (industryToRemove: string) => {
    const currentIndustries = form.getValues("industries");
    form.setValue("industries", currentIndustries.filter(i => i !== industryToRemove));
  };

  const toggleAvailability = (availability: string) => {
    const currentAvailability = form.getValues("availability");
    if (currentAvailability.includes(availability)) {
      form.setValue("availability", currentAvailability.filter(a => a !== availability));
    } else {
      form.setValue("availability", [...currentAvailability, availability]);
    }
  };

  if (profileLoading && isEditing) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading your profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="w-5 h-5 text-accent" />
          <span>{isEditing ? "Edit Mentor Profile" : "Create Mentor Profile"}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEditing 
            ? "Update your mentor profile information and availability"
            : "Set up your mentor profile to start connecting with participants"
          }
        </p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Bio Section */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Professional Bio</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell participants about your background, experience, and what you're passionate about mentoring..."
                      className="min-h-[100px]"
                      data-testid="input-mentor-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {field.value?.length || 0}/500 characters
                  </p>
                </FormItem>
              )}
            />


            {/* Expertise Section */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-1">
                <Star className="w-4 h-4" />
                <span>Areas of Expertise</span>
              </Label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {expertiseOptions.map((expertise) => {
                  const isSelected = form.watch("expertise").includes(expertise);
                  return (
                    <div
                      key={expertise}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        const currentExpertise = form.getValues("expertise");
                        if (isSelected) {
                          form.setValue("expertise", currentExpertise.filter(e => e !== expertise));
                        } else {
                          form.setValue("expertise", [...currentExpertise, expertise]);
                        }
                      }}
                      data-testid={`expertise-${expertise.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="text-sm">{expertise}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Add custom expertise..."
                  value={customExpertise}
                  onChange={(e) => setCustomExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomExpertise())}
                  data-testid="input-custom-expertise"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomExpertise}
                  data-testid="button-add-expertise"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {form.watch("expertise").map((expertise) => (
                  <Badge key={expertise} variant="secondary" className="flex items-center space-x-1">
                    <span>{expertise}</span>
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeExpertise(expertise)}
                    />
                  </Badge>
                ))}
              </div>
              
              {form.formState.errors.expertise && (
                <p className="text-sm text-destructive">{form.formState.errors.expertise.message}</p>
              )}
            </div>

            {/* Industries Section */}
            <div className="space-y-3">
              <Label>Industry Focus</Label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {industryOptions.map((industry) => {
                  const isSelected = form.watch("industries").includes(industry);
                  return (
                    <div
                      key={industry}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-accent bg-accent/10 text-accent" 
                          : "border-border hover:border-accent/50"
                      }`}
                      onClick={() => {
                        const currentIndustries = form.getValues("industries");
                        if (isSelected) {
                          form.setValue("industries", currentIndustries.filter(i => i !== industry));
                        } else {
                          form.setValue("industries", [...currentIndustries, industry]);
                        }
                      }}
                      data-testid={`industry-${industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="text-sm">{industry}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Add custom industry..."
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomIndustry())}
                  data-testid="input-custom-industry"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomIndustry}
                  data-testid="button-add-industry"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {form.watch("industries").map((industry) => (
                  <Badge key={industry} variant="secondary" className="flex items-center space-x-1">
                    <span>{industry}</span>
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeIndustry(industry)}
                    />
                  </Badge>
                ))}
              </div>
              
              {form.formState.errors.industries && (
                <p className="text-sm text-destructive">{form.formState.errors.industries.message}</p>
              )}
            </div>

            {/* Availability Section */}
            <div className="space-y-3">
              <Label>Availability</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availabilityOptions.map((availability) => {
                  const isSelected = form.watch("availability").includes(availability);
                  return (
                    <div
                      key={availability}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleAvailability(availability)}
                      data-testid={`availability-${availability.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="text-sm">{availability}</span>
                    </div>
                  );
                })}
              </div>
              
              {form.formState.errors.availability && (
                <p className="text-sm text-destructive">{form.formState.errors.availability.message}</p>
              )}
            </div>

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-is-active"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Mentoring Status
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check this to make your profile visible to participants for booking sessions
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="submit"
                disabled={createProfile.isPending || updateProfile.isPending}
                data-testid="button-save-profile"
                className="flex items-center space-x-2"
              >
                {createProfile.isPending || updateProfile.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isEditing ? "Updating..." : "Creating..."}</span>
                  </>
                ) : (
                  <>
                    {isEditing ? <Save className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{isEditing ? "Update Profile" : "Create Profile"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}