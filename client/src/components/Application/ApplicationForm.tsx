import { useState } from "react";
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

const applicationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  location: z.string().min(2, "Location is required"),
  timezone: z.string().min(2, "Timezone is required"),
  
  // Education & Experience
  education: z.string().min(10, "Education background must be at least 10 characters"),
  experience: z.string().min(10, "Professional experience must be at least 10 characters"),
  skills: z.array(z.string()).min(3, "Please select at least 3 skills"),
  
  // Project & Idea
  hasIdea: z.boolean(),
  ideaDescription: z.string().optional(),
  problemStatement: z.string().optional(),
  targetMarket: z.string().optional(),
  
  // Availability & Commitment
  availability: z.enum(["full-time", "part-time", "weekends"]),
  commitmentReason: z.string().min(50, "Please explain your commitment in at least 50 characters"),
  
  // Documents
  resumeUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  
  // Agreements
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
  privacyAccepted: z.boolean().refine(val => val === true, "You must accept the privacy policy"),
  
  // Cohort selection
  cohortId: z.string().min(1, "Please select a cohort"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const skillOptions = [
  "Artificial Intelligence", "AI Agents", "LLMs", "Machine Learning", "Deep Learning", 
  "Computer Vision", "Natural Language Processing", "Data Science", "Software Engineering", 
  "Product Management", "UI/UX Design", "Business Development", "Marketing", "Finance", 
  "Operations", "Research", "Entrepreneurship", "Leadership", "Project Management"
];

const stepLabels = ["Personal details", "Experience", "Idea", "Commitment", "Documents", "Review"];

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
        title: "Application submitted",
        description: "Thank you for applying. You will receive a confirmation email shortly.",
      });
      onComplete?.();
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not submit application",
        description: "Please try again.",
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
      title: "File uploaded",
      description: `${file.fileName} is attached to your application.`,
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
    if (errors.firstName) errorMessages.push("First name is required");
    if (errors.lastName) errorMessages.push("Last name is required");
    if (errors.email) errorMessages.push("Valid email address is required");
    if (errors.education) errorMessages.push("Education background must be at least 10 characters");
    if (errors.experience) errorMessages.push("Professional experience must be at least 10 characters");
    if (errors.skills) errorMessages.push("Please select at least 3 skills");
    if (errors.commitmentReason) errorMessages.push("Commitment explanation must be at least 50 characters");
    if (errors.termsAccepted) errorMessages.push("You must accept the terms and conditions");
    if (errors.privacyAccepted) errorMessages.push("You must accept the privacy policy");
    if (errors.cohortId) errorMessages.push("Please select a cohort");
    
    // Handle idea validation
    if (errors.ideaDescription || errors.problemStatement || errors.targetMarket) {
      errorMessages.push("If you have an idea, please fill in all idea-related fields");
    }
    
    const message = errorMessages.length > 0 
      ? errorMessages.join(" • ") 
      : "Please check all required fields are filled correctly.";
    
    toast({
      title: "Some required fields need attention",
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
            <h2 className="font-display text-base font-medium">Your application</h2>
            <span className="font-display text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <ol className="flex items-start" aria-label="Application steps">
            {stepLabels.map((label, index) => {
              const step = index + 1;
              const state = step < currentStep ? "done" : step === currentStep ? "current" : "upcoming";
              return (
                <li key={label} className="flex flex-1 items-start last:flex-none">
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
                      {label}
                      {state === "done" ? " (completed)" : state === "current" ? " (current step)" : ""}
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
                  <span>Personal details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-first-name"
                            readOnly
                            title="Auto-populated from your profile"
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
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            data-testid="input-last-name"
                            readOnly
                            title="Auto-populated from your profile"
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
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          data-testid="input-email"
                          readOnly
                          title="Auto-populated from your profile"
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
                        <FormLabel>Phone number</FormLabel>
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
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="City, State/Country"
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
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder="Select your timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                          <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                          <SelectItem value="CST">Central Time (CST)</SelectItem>
                          <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                          <SelectItem value="GMT">Greenwich Mean Time (GMT)</SelectItem>
                          <SelectItem value="CET">Central European Time (CET)</SelectItem>
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
                  <span>Education and experience</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Educational background</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Describe your educational background, including degree(s), institutions, and relevant coursework..."
                          className="min-h-[100px]"
                          data-testid="textarea-education"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Minimum 10 characters required ({field.value?.length || 0}/10)
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
                      <FormLabel>Professional experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Describe your professional experience, including roles, companies, and key achievements..."
                          className="min-h-[100px]"
                          data-testid="textarea-experience"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Minimum 10 characters required ({field.value?.length || 0}/10)
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
                      <FormLabel>Skills and expertise</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Select at least 3 skills that best describe your expertise.
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {skillOptions.map((skill) => (
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
                                  {skill}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((skill) => (
                                <Badge key={skill} variant="secondary">
                                  {skill}
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
                  <span>Project and idea</span>
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
                          I have a startup idea I would like to develop
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
                          <FormLabel>Idea description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Briefly describe your startup idea, including the AI/technology components..."
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
                          <FormLabel>Problem statement</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="What specific problem does your idea solve? Who experiences this problem?"
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
                          <FormLabel>Target market</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Who is your target customer? What market are you addressing?"
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
                          <p className="text-sm font-medium">That is fine</p>
                          <p className="text-sm text-muted-foreground">
                            The program includes ideation workshops and will help you develop and validate startup ideas throughout the cohort.
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
                  <span>Availability and commitment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time commitment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-availability">
                            <SelectValue placeholder="Select your availability" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">
                            Full-time (40+ hours a week), recommended
                          </SelectItem>
                          <SelectItem value="part-time">
                            Part-time (20–30 hours a week)
                          </SelectItem>
                          <SelectItem value="weekends">
                            Weekends only (10–15 hours a week)
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
                      <FormLabel>Why MD Genius Launchpad?</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Why are you applying to this program? What do you hope to achieve? How does this align with your career goals?"
                          className="min-h-[120px]"
                          data-testid="textarea-commitment-reason"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Minimum 50 characters required ({field.value?.length || 0}/50)
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
                      <FormLabel>Preferred cohort</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cohort">
                            <SelectValue placeholder="Select a cohort" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cohorts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No active cohorts available
                            </div>
                          ) : (
                            cohorts.map((cohort: any) => (
                              <SelectItem 
                                key={cohort.id} 
                                value={cohort.id}
                                data-testid={`select-item-cohort-${cohort.id}`}
                              >
                                {cohort.name} - Starts {formatCohortDate(cohort.startDate)}
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
                  <span>Documents and links</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Resume or CV (required)</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your current resume or CV.
                    </p>
                    <ObjectUploader
                      maxFileSize={10 * 1024 * 1024}
                      accept=".pdf,.doc,.docx"
                      onUploaded={(file) => handleUploadComplete(file, 'resume')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload resume
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
                          <FormLabel>Portfolio URL (optional)</FormLabel>
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
                          <FormLabel>GitHub profile (optional)</FormLabel>
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
                        <FormLabel>LinkedIn profile (optional)</FormLabel>
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
                <CardTitle>Review and submit</CardTitle>
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
                              I agree to the{" "}
                              <a 
                                href="/terms" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                                data-testid="link-terms"
                              >
                                terms and conditions
                              </a>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              By checking this box, you agree to our program terms, intellectual property policies, and code of conduct.
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
                              I agree to the{" "}
                              <a 
                                href="/privacy" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                                data-testid="link-privacy"
                              >
                                privacy policy
                              </a>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              We will handle your personal data in accordance with our privacy policy and applicable data protection laws.
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
                        <p className="text-sm font-medium">How we review applications</p>
                        <p className="text-sm text-muted-foreground">
                          After you submit, our admissions team reviews your application and invites selected
                          candidates to an interview. We will keep you updated by email.
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
                  Previous
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    data-testid="button-next"
                  >
                    Next step
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitApplication.isPending}
                    data-testid="button-submit-application"
                  >
                    {submitApplication.isPending ? "Submitting..." : "Submit application"}
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
