import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { BlockLoader } from "@/components/brand";
import type { MentorProfile } from "@shared/schema";

// Mentor Profile Form Schema (messages follow the UI language)
const mentorProfileSchema = (t: TFunction<"mentors">) =>
  z.object({
    expertise: z.array(z.string()).min(1, t("form.validation.expertiseMin")),
    bio: z.string().min(50, t("form.validation.bioMin")).max(500, t("form.validation.bioMax")),
    industries: z.array(z.string()).min(1, t("form.validation.industriesMin")),
    availability: z.array(z.string()).min(1, t("form.validation.availabilityMin")),
    isActive: z.boolean().default(true),
  });

type MentorProfileFormData = z.infer<ReturnType<typeof mentorProfileSchema>>;

export type MentorOptionGroup = "expertise" | "industries" | "availability";

/** Stable catalog key for a stored option value, e.g. "Web3/Blockchain" -> "web3_blockchain". */
export function optionSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/**
 * Display label for a stored mentor option (expertise, industry, availability).
 * Stored values never change; unknown or custom values are shown as written.
 */
export function useMentorOptionLabel() {
  const { t, i18n } = useTranslation("mentors");
  return useCallback(
    (group: MentorOptionGroup, value: string) => {
      const key = `mentors:options.${group}.${optionSlug(value)}`;
      return i18n.exists(key) ? String(t(key as never)) : value;
    },
    [t, i18n],
  );
}

interface MentorProfileFormProps {
  onComplete?: () => void;
  isEditing?: boolean;
}

// Pre-defined options (stored values; labels come from mentors:options.*)
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
  const { t } = useTranslation("mentors");
  const optionLabel = useMentorOptionLabel();
  const schema = useMemo(() => mentorProfileSchema(t), [t]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customExpertise, setCustomExpertise] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");

  // Fetch existing mentor profile if editing
  const { data: existingProfile, isLoading: profileLoading } = useQuery<MentorProfile | null>({
    queryKey: ['/api/mentor/profile'],
    enabled: isEditing && !!user,
  });

  const form = useForm<MentorProfileFormData>({
    resolver: zodResolver(schema),
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
        title: t("form.toast.created.title"),
        description: t("form.toast.created.description"),
      });
      onComplete?.();
      queryClient.invalidateQueries({ queryKey: ['/api/mentor/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: t("form.toast.createFailed.title"),
        description: error.message || t("form.toast.createFailed.description"),
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
        title: t("form.toast.saved.title"),
        description: t("form.toast.saved.description"),
      });
      onComplete?.();
      queryClient.invalidateQueries({ queryKey: ['/api/mentor/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mentors'] });
    },
    onError: (error: any) => {
      toast({
        title: t("form.toast.saveFailed.title"),
        description: error.message || t("form.toast.saveFailed.description"),
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
      <Card>
        <CardContent className="p-6">
          <BlockLoader label={t("form.loading")} className="py-8" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center space-x-2 font-display font-medium">
          <Star className="w-5 h-5" />
          <span>{isEditing ? t("form.editTitle") : t("form.createTitle")}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEditing ? t("form.editDescription") : t("form.createDescription")}
        </p>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6 min-w-0">
            {/* Bio Section */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{t("form.bio.label")}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("form.bio.placeholder")}
                      className="min-h-[140px]"
                      data-testid="input-mentor-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {t("form.bio.count", { length: field.value?.length || 0 })}
                  </p>
                </FormItem>
              )}
            />


            {/* Expertise Section */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-1">
                <Star className="w-4 h-4" />
                <span>{t("form.expertise.label")}</span>
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {expertiseOptions.map((expertise) => {
                  const isSelected = form.watch("expertise").includes(expertise);
                  return (
                    <div
                      key={expertise}
                      className={`px-3 py-2 border rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary font-medium" 
                          : "border-border hover:border-accent/50"
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
                      <span className="text-sm">{optionLabel("expertise", expertise)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t("form.expertise.customPlaceholder")}
                  value={customExpertise}
                  onChange={(e) => setCustomExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomExpertise())}
                  data-testid="input-custom-expertise"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomExpertise}
                  aria-label={t("form.expertise.add")}
                  title={t("form.expertise.add")}
                  data-testid="button-add-expertise"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {form.watch("expertise").map((expertise) => (
                  <Badge key={expertise} variant="secondary" className="flex items-center space-x-1">
                    <span>{optionLabel("expertise", expertise)}</span>
                    <button
                      type="button"
                      onClick={() => removeExpertise(expertise)}
                      className="rounded-sm hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={t("form.expertise.remove", { value: optionLabel("expertise", expertise) })}
                      title={t("form.remove")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {form.formState.errors.expertise && (
                <p className="text-sm text-destructive">{form.formState.errors.expertise.message}</p>
              )}
            </div>

            </div>
            <div className="space-y-6 min-w-0">
            {/* Industries Section */}
            <div className="space-y-3">
              <Label>{t("form.industries.label")}</Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {industryOptions.map((industry) => {
                  const isSelected = form.watch("industries").includes(industry);
                  return (
                    <div
                      key={industry}
                      className={`px-3 py-2 border rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary font-medium" 
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
                      <span className="text-sm">{optionLabel("industries", industry)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder={t("form.industries.customPlaceholder")}
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomIndustry())}
                  data-testid="input-custom-industry"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomIndustry}
                  aria-label={t("form.industries.add")}
                  title={t("form.industries.add")}
                  data-testid="button-add-industry"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {form.watch("industries").map((industry) => (
                  <Badge key={industry} variant="secondary" className="flex items-center space-x-1">
                    <span>{optionLabel("industries", industry)}</span>
                    <button
                      type="button"
                      onClick={() => removeIndustry(industry)}
                      className="rounded-sm hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={t("form.industries.remove", { value: optionLabel("industries", industry) })}
                      title={t("form.remove")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {form.formState.errors.industries && (
                <p className="text-sm text-destructive">{form.formState.errors.industries.message}</p>
              )}
            </div>

            {/* Availability Section */}
            <div className="space-y-3">
              <Label>{t("form.availability.label")}</Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availabilityOptions.map((availability) => {
                  const isSelected = form.watch("availability").includes(availability);
                  return (
                    <div
                      key={availability}
                      className={`px-3 py-2 border rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/5 text-primary font-medium" 
                          : "border-border hover:border-accent/50"
                      }`}
                      onClick={() => toggleAvailability(availability)}
                      data-testid={`availability-${availability.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="text-sm">{optionLabel("availability", availability)}</span>
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
                    <FormLabel>{t("form.active.label")}</FormLabel>
                    <p className="text-sm text-muted-foreground">{t("form.active.description")}</p>
                  </div>
                </FormItem>
              )}
            />

            </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button
                type="submit"
                disabled={createProfile.isPending || updateProfile.isPending}
                data-testid="button-save-profile"
                className="flex items-center space-x-2"
              >
                {createProfile.isPending || updateProfile.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>{isEditing ? t("form.submit.saving") : t("form.submit.creating")}</span>
                  </>
                ) : (
                  <>
                    {isEditing ? <Save className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{isEditing ? t("form.submit.save") : t("form.submit.create")}</span>
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