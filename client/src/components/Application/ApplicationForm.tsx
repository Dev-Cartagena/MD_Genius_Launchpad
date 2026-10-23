import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocalized } from "@/lib/localized";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader, fileUrl, type UploadedFile } from "@/components/ObjectUploader";
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  Lightbulb, 
  Clock, 
  MapPin,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import type { Cohort } from "@shared/schema";
import { formatCohortDate } from "@/lib/dates";
import { ConnectorBadge } from "@/components/brand";

function makeApplicationSchema(t: TFunction<"application">) {
  return z.object({
    // Personal Information
    firstName: z.string().min(2, t("form.validation.firstNameMin")),
    lastName: z.string().min(2, t("form.validation.lastNameMin")),
    email: z.string().email(t("form.validation.invalidEmail")),
    phone: z.string().min(10, t("form.validation.phoneMin")),
    location: z.string().min(2, t("form.validation.locationRequired")),
    timezone: z.string().min(2, t("form.validation.timezoneRequired")),

    // Education & Experience
    education: z.string().min(10, t("form.validation.educationMin")),
    experience: z.string().min(10, t("form.validation.experienceMin")),
    skills: z.array(z.string()).min(3, t("form.validation.skillsMin")),

    // Project & Idea
    hasIdea: z.boolean(),
    ideaDescription: z.string().optional(),
    problemStatement: z.string().optional(),
    targetMarket: z.string().optional(),

    // Availability & Commitment
    availability: z.enum(["full-time", "part-time", "weekends"]),
    commitmentReason: z.string().min(50, t("form.validation.commitmentMin")),

    // Documents
    resumeUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    linkedinUrl: z.string().optional(),

    // Agreements
    termsAccepted: z.boolean().refine(val => val === true, t("form.validation.termsRequired")),
    privacyAccepted: z.boolean().refine(val => val === true, t("form.validation.privacyRequired")),

    // Cohort selection
    cohortId: z.string().min(1, t("form.validation.cohortRequired")),
  });
}

type ApplicationFormData = z.infer<ReturnType<typeof makeApplicationSchema>>;

/** Stored skill values (sent to the server as is) and the catalog key for each label. */
const skillOptions = [
  { value: "Artificial Intelligence", key: "ai" },
  { value: "AI Agents", key: "aiAgents" },
  { value: "LLMs", key: "llms" },
  { value: "Machine Learning", key: "ml" },
  { value: "Deep Learning", key: "deepLearning" },
  { value: "Computer Vision", key: "computerVision" },
  { value: "Natural Language Processing", key: "nlp" },
  { value: "Data Science", key: "dataScience" },
  { value: "Software Engineering", key: "softwareEngineering" },
  { value: "Product Management", key: "productManagement" },
  { value: "UI/UX Design", key: "design" },
  { value: "Business Development", key: "businessDevelopment" },
  { value: "Marketing", key: "marketing" },
  { value: "Finance", key: "finance" },
  { value: "Operations", key: "operations" },
  { value: "Research", key: "research" },
  { value: "Entrepreneurship", key: "entrepreneurship" },
  { value: "Leadership", key: "leadership" },
  { value: "Project Management", key: "projectManagement" },
] as const;

const stepKeys = ["personal", "experience", "idea", "commitment", "documents", "review"] as const;

const timezoneOptions = ["PST", "MST", "CST", "EST", "GMT", "CET"] as const;

interface ApplicationFormProps {
  onComplete?: () => void;
}

export default function ApplicationForm({ onComplete }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<{ type: string; path: string; fileName: string }[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const totalSteps = 6;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation("application");
  const localized = useLocalized();
  const applicationSchema = useMemo(() => makeApplicationSchema(t), [t]);
  const skillLabel = (value: string) => {
    const option = skillOptions.find((o) => o.value === value);
    return option ? t(`form.skills.${option.key}`) : value;
  };

  // Fetch available cohorts
  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      // Personal Information (auto-populated from user profile)
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      location: "",
      timezone: "",
      
      // Education & Experience
      education: "",
      experience: "",
      skills: [],
      
      // Project & Idea
      hasIdea: false,
      ideaDescription: "",
      problemStatement: "",
      targetMarket: "",
      
      // Availability & Commitment
      availability: "full-time",
      commitmentReason: "",
      
      // Documents
      resumeUrl: "",
      portfolioUrl: "",
      githubUrl: "",
      linkedinUrl: "",
      
      // Agreements
      termsAccepted: false,
      privacyAccepted: false,
      
      // Cohort selection
      cohortId: "",
    },
  });

  const submitApplication = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      // Only cohortId, answers and uploads are sent; status/scores are set by the server
      const response = await apiRequest("POST", "/api/applications/submit", {
        cohortId: data.cohortId,
        answers: {
          personalInfo: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            location: data.location,
            timezone: data.timezone
          },
          education: data.education,
          experience: data.experience,
          skills: data.skills,
          idea: data.hasIdea ? {
            description: data.ideaDescription,
            problem: data.problemStatement,
            market: data.targetMarket
          } : null,
          availability: data.availability,
          commitment: data.commitmentReason,
          links: {
            resume: data.resumeUrl,
            portfolio: data.portfolioUrl,
            github: data.githubUrl,
            linkedin: data.linkedinUrl
          }
        },
        uploads: uploadedFiles.map(f => f.path)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("form.toast.submitted.title"),
        description: t("form.toast.submitted.description"),
      });
      onComplete?.();
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("form.toast.signedOut.title"),
          description: t("form.toast.signedOut.description"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("form.toast.submitFailed.title"),
        description: t("form.toast.submitFailed.description"),
        variant: "destructive",
      });
    }
  });

  const handleUploadComplete = (file: UploadedFile, fileType: string) => {
    // One file per type: a new upload replaces the previous one
    setUploadedFiles(prev => [
      ...prev.filter(f => f.type !== fileType),
      { type: fileType, path: file.path, fileName: file.fileName },
    ]);

    if (fileType === 'resume') {
      form.setValue('resumeUrl', file.path);
    }

    toast({
      title: t("form.toast.uploaded.title"),
      description: t("form.toast.uploaded.description", { fileName: file.fileName }),
    });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: ApplicationFormData) => {
    setHasAttemptedSubmit(true);
    submitApplication.mutate(data);
  };

  // Show specific validation errors
  const handleFormError = (errors: any) => {
    const errorMessages: string[] = [];
    
    // Check specific field errors and provide helpful messages
    if (errors.firstName) errorMessages.push(t("form.errors.firstName"));
    if (errors.lastName) errorMessages.push(t("form.errors.lastName"));
    if (errors.email) errorMessages.push(t("form.errors.email"));
    if (errors.education) errorMessages.push(t("form.errors.education"));
    if (errors.experience) errorMessages.push(t("form.errors.experience"));
    if (errors.skills) errorMessages.push(t("form.errors.skills"));
    if (errors.commitmentReason) errorMessages.push(t("form.errors.commitment"));
    if (errors.termsAccepted) errorMessages.push(t("form.errors.terms"));
    if (errors.privacyAccepted) errorMessages.push(t("form.errors.privacy"));
    if (errors.cohortId) errorMessages.push(t("form.errors.cohort"));
    
    // Handle idea validation
    if (errors.ideaDescription || errors.problemStatement || errors.targetMarket) {
      errorMessages.push(t("form.errors.idea"));
    }
    
    const message = errorMessages.length > 0 
      ? errorMessages.join(" • ") 
      : t("form.errors.generic");
    
    toast({
      title: t("form.toast.invalid.title"),
      description: message,
      variant: "destructive",
    });
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicator */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-medium">{t("form.header")}</h2>
            <span className="font-display text-sm text-muted-foreground">
              {t("form.stepCounter", { current: currentStep, total: totalSteps })}
            </span>
          </div>
          <ol className="flex items-start" aria-label={t("form.stepsLabel")}>
            {stepKeys.map((stepKey, index) => {
              const step = index + 1;
              const label = t(`form.steps.${stepKey}`);
              const state = step < currentStep ? "done" : step === currentStep ? "current" : "upcoming";
              return (
                <li key={stepKey} className="flex flex-1 items-start last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <ConnectorBadge state={state}>{step}</ConnectorBadge>
                    <span
                      className={`hidden sm:block font-display text-xs text-center ${
                        state === "current" ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="sr-only">
                      {state === "done"
                        ? t("form.stepDone", { label })
                        : state === "current"
                          ? t("form.stepCurrent", { label })
                          : label}
                    </span>
                  </div>
                  {step < totalSteps && (
                    <div
                      aria-hidden="true"
                      className={`mt-[18px] h-px flex-1 mx-1 sm:mx-2 ${step < currentStep ? "bg-primary" : "bg-border"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <Progress value={progress} className="h-1 mt-5" data-testid="application-progress" />
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>{t("form.personal.title")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.personal.firstName")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-first-name"
                            readOnly
                            title={t("form.autoPopulated")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.personal.lastName")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-last-name"
                            readOnly
                            title={t("form.autoPopulated")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.personal.email")}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          data-testid="input-email"
                          readOnly
                          title={t("form.autoPopulated")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.personal.phone")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.personal.location")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t("form.personal.locationPlaceholder")}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.personal.timezone")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder={t("form.personal.timezonePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezoneOptions.map((zone) => (
                            <SelectItem key={zone} value={zone}>
                              {t(`form.personal.timezones.${zone}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Education & Experience */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>{t("form.experience.title")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.experience.education")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t("form.experience.educationPlaceholder")}
                          className="min-h-[100px]"
                          data-testid="textarea-education"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("form.minChars", { min: 10, length: field.value?.length || 0 })}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.experience.experience")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t("form.experience.experiencePlaceholder")}
                          className="min-h-[100px]"
                          data-testid="textarea-experience"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("form.minChars", { min: 10, length: field.value?.length || 0 })}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.experience.skills")}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {t("form.experience.skillsHint")}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {skillOptions.map(({ value: skill, key: skillKey }) => (
                              <div key={skill} className="flex items-center space-x-2">
                                <Checkbox
                                  id={skill}
                                  checked={field.value?.includes(skill)}
                                  onCheckedChange={(checked) => {
                                    const updatedSkills = checked
                                      ? [...(field.value || []), skill]
                                      : field.value?.filter(s => s !== skill) || [];
                                    field.onChange(updatedSkills);
                                  }}
                                  data-testid={`checkbox-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                                />
                                <Label htmlFor={skill} className="text-sm">
                                  {t(`form.skills.${skillKey}`)}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((skill) => (
                                <Badge key={skill} variant="secondary">
                                  {skillLabel(skill)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Project & Idea */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>{t("form.idea.title")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hasIdea"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasIdea"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-has-idea"
                        />
                        <Label htmlFor="hasIdea" className="text-base font-medium">
                          {t("form.idea.hasIdea")}
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("hasIdea") && (
                  <>
                    <FormField
                      control={form.control}
                      name="ideaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.idea.description")}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder={t("form.idea.descriptionPlaceholder")}
                              className="min-h-[100px]"
                              data-testid="textarea-idea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="problemStatement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.idea.problem")}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder={t("form.idea.problemPlaceholder")}
                              className="min-h-[80px]"
                              data-testid="textarea-problem-statement"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetMarket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.idea.market")}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder={t("form.idea.marketPlaceholder")}
                              className="min-h-[80px]"
                              data-testid="textarea-target-market"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {!form.watch("hasIdea") && (
                  <Card className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{t("form.idea.noIdeaTitle")}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("form.idea.noIdeaBody")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Availability & Commitment */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{t("form.commitment.title")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.commitment.time")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-availability">
                            <SelectValue placeholder={t("form.commitment.timePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">
                            {t("form.commitment.availability.full-time")}
                          </SelectItem>
                          <SelectItem value="part-time">
                            {t("form.commitment.availability.part-time")}
                          </SelectItem>
                          <SelectItem value="weekends">
                            {t("form.commitment.availability.weekends")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commitmentReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.commitment.why")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t("form.commitment.whyPlaceholder")}
                          className="min-h-[120px]"
                          data-testid="textarea-commitment-reason"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("form.minChars", { min: 50, length: field.value?.length || 0 })}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cohortId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.commitment.cohort")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cohort">
                            <SelectValue placeholder={t("form.commitment.cohortPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cohorts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              {t("form.commitment.noCohorts")}
                            </div>
                          ) : (
                            cohorts.map((cohort: any) => (
                              <SelectItem 
                                key={cohort.id} 
                                value={cohort.id}
                                data-testid={`select-item-cohort-${cohort.id}`}
                              >
                                {t("form.commitment.cohortOption", {
                                  name: localized.text(cohort, "name"),
                                  date: formatCohortDate(cohort.startDate),
                                })}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 5: Documents & Links */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>{t("form.documents.title")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">{t("form.documents.resume")}</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("form.documents.resumeHint")}
                    </p>
                    <ObjectUploader
                      maxFileSize={10 * 1024 * 1024}
                      accept=".pdf,.doc,.docx"
                      onUploaded={(file) => handleUploadComplete(file, 'resume')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("form.documents.uploadResume")}
                    </ObjectUploader>
                    {uploadedFiles.filter(f => f.type === 'resume').map(f => (
                      <div key={f.path} className="flex items-center space-x-2 mt-3">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <a
                          href={fileUrl(f.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent hover:underline"
                          data-testid="link-uploaded-resume"
                        >
                          {f.fileName}
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="portfolioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.documents.portfolio")}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="https://your-portfolio.com"
                              data-testid="input-portfolio-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="githubUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.documents.github")}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="https://github.com/username"
                              data-testid="input-github-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.documents.linkedin")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="https://linkedin.com/in/username"
                            data-testid="input-linkedin-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Terms & Submit */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("form.review.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="termsAccepted"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-terms"
                          />
                          <div className="space-y-1">
                            <Label htmlFor="termsAccepted" className="text-sm font-medium">
                              <Trans
                                t={t}
                                i18nKey="form.review.terms"
                                components={{
                                  link: (
                                    <a
                                      href="/terms"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-accent hover:underline"
                                      data-testid="link-terms"
                                    />
                                  ),
                                }}
                              />
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t("form.review.termsHint")}
                            </p>
                          </div>
                        </div>
                        {hasAttemptedSubmit && <FormMessage />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="privacyAccepted"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="privacyAccepted"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-privacy"
                          />
                          <div className="space-y-1">
                            <Label htmlFor="privacyAccepted" className="text-sm font-medium">
                              <Trans
                                t={t}
                                i18nKey="form.review.privacy"
                                components={{
                                  link: (
                                    <a
                                      href="/privacy"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-accent hover:underline"
                                      data-testid="link-privacy"
                                    />
                                  ),
                                }}
                              />
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t("form.review.privacyHint")}
                            </p>
                          </div>
                        </div>
                        {hasAttemptedSubmit && <FormMessage />}
                      </FormItem>
                    )}
                  />
                </div>

                <Card className="bg-secondary border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t("form.review.howTitle")}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("form.review.howBody")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep} 
                  disabled={currentStep === 1}
                  data-testid="button-previous"
                >
                  {t("form.nav.previous")}
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    data-testid="button-next"
                  >
                    {t("form.nav.next")}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitApplication.isPending}
                    data-testid="button-submit-application"
                  >
                    {submitApplication.isPending ? t("form.nav.submitting") : t("form.nav.submit")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
