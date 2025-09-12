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
import { ObjectUploader } from "@/components/ObjectUploader";
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

interface ApplicationFormProps {
  onComplete?: () => void;
}

export default function ApplicationForm({ onComplete }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<{ type: string; url: string }[]>([]);
  const totalSteps = 6;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available cohorts
  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      // Personal Information
      firstName: "",
      lastName: "",
      email: "",
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
      const response = await apiRequest("POST", "/api/applications/submit", {
        ...data,
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
        uploads: uploadedFiles.map(f => f.url)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Thank you for applying. You'll receive a confirmation email shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      return { method: "PUT" as const, url: data.uploadURL };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: any, fileType: string) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileUrl = uploadedFile.uploadURL;
      
      setUploadedFiles(prev => [...prev, { type: fileType, url: fileUrl }]);
      
      // Update form field based on file type
      if (fileType === 'resume') {
        form.setValue('resumeUrl', fileUrl);
      }
      
      toast({
        title: "File uploaded successfully!",
        description: `${fileType} has been uploaded and attached to your application.`,
      });
    }
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
    submitApplication.mutate(data);
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Application Progress</h2>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="application-progress" />
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-secondary border-border input-glow"
                            data-testid="input-first-name"
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-secondary border-border input-glow"
                            data-testid="input-last-name"
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          className="bg-secondary border-border input-glow"
                          data-testid="input-email"
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel"
                            className="bg-secondary border-border input-glow"
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
                            className="bg-secondary border-border input-glow"
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
                          <SelectTrigger className="bg-secondary border-border" data-testid="select-timezone">
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
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>Education & Experience</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Educational Background</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Describe your educational background, including degree(s), institutions, and relevant coursework..."
                          className="bg-secondary border-border input-glow min-h-[100px]"
                          data-testid="textarea-education"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Describe your professional experience, including roles, companies, and key achievements..."
                          className="bg-secondary border-border input-glow min-h-[100px]"
                          data-testid="textarea-experience"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills & Expertise</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Select at least 3 skills that best describe your expertise:
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
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Project & Idea</span>
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
                          I have a startup idea I'd like to develop
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
                          <FormLabel>Idea Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Briefly describe your startup idea, including the AI/technology components..."
                              className="bg-secondary border-border input-glow min-h-[100px]"
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
                          <FormLabel>Problem Statement</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="What specific problem does your idea solve? Who experiences this problem?"
                              className="bg-secondary border-border input-glow min-h-[80px]"
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
                          <FormLabel>Target Market</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Who is your target customer? What market are you addressing?"
                              className="bg-secondary border-border input-glow min-h-[80px]"
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
                  <Card className="bg-primary/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">No problem!</p>
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
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Availability & Commitment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Commitment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border" data-testid="select-availability">
                            <SelectValue placeholder="Select your availability" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">
                            Full-time (40+ hours/week) - Recommended
                          </SelectItem>
                          <SelectItem value="part-time">
                            Part-time (20-30 hours/week)
                          </SelectItem>
                          <SelectItem value="weekends">
                            Weekends only (10-15 hours/week)
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
                          className="bg-secondary border-border input-glow min-h-[120px]"
                          data-testid="textarea-commitment-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cohortId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Cohort</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border" data-testid="select-cohort">
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
                                {cohort.name} - Starts {new Date(cohort.startDate).toLocaleDateString()}
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
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Documents & Links</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Resume/CV (Required)</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your current resume or CV
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleFileUpload}
                      onComplete={(result) => handleUploadComplete(result, 'resume')}
                      buttonClassName="bg-primary hover:bg-primary/90"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Resume
                    </ObjectUploader>
                    {uploadedFiles.find(f => f.type === 'resume') && (
                      <div className="flex items-center space-x-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Resume uploaded successfully</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="portfolioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="https://your-portfolio.com"
                              className="bg-secondary border-border input-glow"
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
                          <FormLabel>GitHub Profile (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="https://github.com/username"
                              className="bg-secondary border-border input-glow"
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
                        <FormLabel>LinkedIn Profile (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="https://linkedin.com/in/username"
                            className="bg-secondary border-border input-glow"
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
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
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
                                className="text-primary hover:underline"
                                data-testid="link-terms"
                              >
                                Terms and Conditions
                              </a>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              By checking this box, you agree to our program terms, intellectual property policies, and code of conduct.
                            </p>
                          </div>
                        </div>
                        <FormMessage />
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
                                className="text-primary hover:underline"
                                data-testid="link-privacy"
                              >
                                Privacy Policy
                              </a>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              We will handle your personal data in accordance with our privacy policy and applicable data protection laws.
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Card className="bg-accent/10 border-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Application Review Process</p>
                        <p className="text-sm text-muted-foreground">
                          After submission, your application will be reviewed by our admissions team. 
                          Selected candidates will be invited for interviews. You'll receive updates via email.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <Card className="glass-card">
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
                    Next Step
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitApplication.isPending}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    data-testid="button-submit-application"
                  >
                    {submitApplication.isPending ? "Submitting..." : "Submit Application"}
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
