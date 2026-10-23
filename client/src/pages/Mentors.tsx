import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { intlLocale } from "@/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MentorSession, MentorWithProfile } from "@shared/schema";

// GET /api/mentors returns users with their mentor profile nested under `mentorProfile`
type ExtendedMentor = MentorWithProfile & {
  // Optional UI fields, not provided by the API yet
  rating?: number;
  totalSessions?: number;
  responseTime?: string;
  isAvailable?: boolean;
  nextAvailable?: string;
  linkedinUrl?: string;
};
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getApiErrorMessage } from "@/lib/utils";
import { useMentorOptionLabel } from "@/components/Mentor/MentorProfileForm";
import {
  Users,
  Search,
  Calendar,
  Star,
  MessageCircle,
  Video,
  Clock,
  Award,
  Filter,
  BookmarkPlus,
  Mail,
  LinkedinIcon,
  ExternalLink
} from "lucide-react";

// Session booking form schema (messages follow the UI language)
const sessionBookingSchema = (t: TFunction<["mentors", "common"]>) =>
  z.object({
    title: z.string().min(5, t("booking.validation.titleMin")),
    agenda: z.string().min(10, t("booking.validation.agendaMin")),
    startTime: z.string().min(1, t("booking.validation.startTimeRequired")),
    duration: z
      .number()
      .min(30, t("booking.validation.durationMin"))
      .max(120, t("booking.validation.durationMax"))
      .default(60),
  });

type SessionBookingFormData = z.infer<ReturnType<typeof sessionBookingSchema>>;

const DURATIONS = [30, 60, 90, 120];

// Session Booking Dialog Component
function SessionBookingDialog({ mentor, isOpen, onClose }: { 
  mentor: ExtendedMentor; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation(["mentors", "common"]);
  const schema = useMemo(() => sessionBookingSchema(t), [t]);
  
  const form = useForm<SessionBookingFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      agenda: "",
      startTime: "",
      duration: 60,
    },
  });

  // Generate time slots with accurate labels
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    
    // Generate slots for next 7 days
    for (let day = 1; day <= 7; day++) {
      const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      const dayLabel = date.toLocaleDateString(intlLocale(), { weekday: "long", month: "short", day: "numeric" });
      const time = (slot: Date) => slot.toLocaleTimeString(intlLocale(), { hour: "numeric", minute: "2-digit" });
      
      // Add morning and afternoon slots
      const morningSlot = new Date(date);
      morningSlot.setHours(10, 0, 0, 0);
      
      const afternoonSlot = new Date(date);
      afternoonSlot.setHours(14, 0, 0, 0);
      
      slots.push({
        value: morningSlot.toISOString(),
        label: t("booking.slot", { day: dayLabel, time: time(morningSlot) })
      });
      
      slots.push({
        value: afternoonSlot.toISOString(),
        label: t("booking.slot", { day: dayLabel, time: time(afternoonSlot) })
      });
    }
    
    return slots.slice(0, 8); // Return first 8 slots
  };
  
  const timeSlots = generateTimeSlots();

  const bookSession = useMutation({
    mutationFn: async (data: SessionBookingFormData) => {
      const endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60 * 1000).toISOString();
      
      return apiRequest("POST", "/api/sessions/book", {
        mentorId: mentor.id,
        title: data.title,
        agenda: data.agenda,
        startTime: new Date(data.startTime).toISOString(),
        endTime: endTime,
      });
    },
    onSuccess: () => {
      toast({
        title: t("booking.toast.booked.title"),
        description: t("booking.toast.booked.description", { name: mentor.firstName ?? "" }),
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participant/sessions"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: t("booking.toast.failed.title"),
        description: getApiErrorMessage(error, t("booking.toast.failed.description")),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SessionBookingFormData) => {
    bookSession.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("booking.title", { name: `${mentor.firstName ?? ""} ${mentor.lastName ?? ""}`.trim() })}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.titleLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("booking.titlePlaceholder")}
                      {...field}
                      data-testid={`input-session-title-${mentor.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.slotLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-timeslot-${mentor.id}`}>
                        <SelectValue placeholder={t("booking.slotPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.durationLabel")}</FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-duration-${mentor.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DURATIONS.map((minutes) => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {t("booking.minutes", { count: minutes })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.agendaLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("booking.agendaPlaceholder")}
                      className="min-h-[80px]"
                      {...field}
                      data-testid={`textarea-session-agenda-${mentor.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid={`button-cancel-booking-${mentor.id}`}
              >
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={bookSession.isPending}
                className="flex-1"
                data-testid={`button-confirm-booking-${mentor.id}`}
              >
                {bookSession.isPending ? t("booking.submitting") : t("booking.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Mentors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedMentorForBooking, setSelectedMentorForBooking] = useState<ExtendedMentor | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation(["mentors", "common"]);
  const optionLabel = useMentorOptionLabel();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isParticipant = user?.role === "participant";

  // Fetch mentors with proper typing
  const { data: mentors = [], isLoading } = useQuery<ExtendedMentor[]>({
    queryKey: ["/api/mentors"],
  });

  // Use real mentors data only - no mock fallback in production
  const displayMentors: ExtendedMentor[] = mentors.map((m) => ({
    ...m,
    isAvailable: m.isAvailable ?? m.mentorProfile?.isActive !== false,
  }));

  // Fetch participant's booked sessions
  const { data: mySessions = [] } = useQuery<MentorSession[]>({
    queryKey: ["/api/participant/sessions"],
    enabled: !!user && user.role === 'participant'
  });

  const filteredMentors = displayMentors.filter((mentor) => {
    const matchesSearch = searchQuery === "" || 
      (mentor.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.mentorProfile?.expertise?.some((exp: string) => exp.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);
    
    const matchesExpertise = selectedExpertise === "all" || 
      (mentor.mentorProfile?.expertise?.includes(selectedExpertise) ?? false);
    
    const matchesIndustry = selectedIndustry === "all" ||
      (mentor.mentorProfile?.industries?.includes(selectedIndustry) ?? false);

    return matchesSearch && matchesExpertise && matchesIndustry;
  });

  // Filter options come from the mentors' actual profiles
  const expertiseOptions = Array.from(
    new Set(displayMentors.flatMap((m) => m.mentorProfile?.expertise ?? []))
  ).sort();

  const industryOptions = Array.from(
    new Set(displayMentors.flatMap((m) => m.mentorProfile?.industries ?? []))
  ).sort();

  if (isLoading) {
    return (
      <AppLayout title={t("directory.title")} subtitle={t("directory.loading")}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-11 w-11 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={t("directory.title")}
      subtitle={t("directory.subtitle")}
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="panel p-3 flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={t("filters.searchPlaceholder")}
                    className="pl-10"
                    aria-label={t("filters.searchLabel")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-mentors"
                  />
              </div>
                <Select value={selectedExpertise} onValueChange={setSelectedExpertise}>
                  <SelectTrigger className="w-full sm:w-48" aria-label={t("filters.expertiseLabel")} data-testid="select-expertise-filter">
                    <SelectValue placeholder={t("filters.expertisePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allExpertise")}</SelectItem>
                    {expertiseOptions.map((expertise) => (
                      <SelectItem key={expertise} value={expertise}>{optionLabel("expertise", expertise)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-full sm:w-48" aria-label={t("filters.industryLabel")} data-testid="select-industry-filter">
                    <SelectValue placeholder={t("filters.industryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allIndustries")}</SelectItem>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry} value={industry}>{optionLabel("industries", industry)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
        </div>

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="transition-colors hover:border-accent/40">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-11 w-11 rounded-lg">
                    <AvatarImage className="object-cover" src={mentor.profileImageUrl ?? undefined} alt={`${mentor.firstName ?? ''} ${mentor.lastName ?? ''}`} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-display text-base">
                      {((mentor.firstName ?? '')[0] ?? '') + ((mentor.lastName ?? '')[0] ?? '') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="font-display text-lg font-medium" data-testid={`mentor-name-${mentor.id}`}>
                        {(mentor.firstName ?? '')} {(mentor.lastName ?? '')}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-accent" />
                        <span className="font-display text-sm font-medium" data-testid={`mentor-rating-${mentor.id}`}>
                          {mentor.rating ?? '—'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{t("card.sessions", { count: mentor.totalSessions ?? 0 })}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{mentor.responseTime ? t("card.responds", { time: mentor.responseTime }) : t("card.responseVaries")}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        mentor.isAvailable ? 'bg-success' : 'bg-warning'
                      }`}></div>
                      <span className={`text-xs ${
                        mentor.isAvailable ? 'text-success' : 'text-warning'
                      }`}>
                        {mentor.isAvailable
                          ? mentor.nextAvailable
                            ? t("card.availableFrom", { when: mentor.nextAvailable })
                            : t("card.availableNow")
                          : t("card.unavailable")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed" data-testid={`mentor-bio-${mentor.id}`}>
                  {mentor.mentorProfile?.bio || mentor.bio || t("card.noBio")}
                </p>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <h4 className="font-display text-sm text-muted-foreground mb-2">{t("card.expertise")}</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.mentorProfile?.expertise ?? []).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {optionLabel("expertise", skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-display text-sm text-muted-foreground mb-2">{t("card.industries")}</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.mentorProfile?.industries ?? []).map((industry: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {optionLabel("industries", industry)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    {mentor.linkedinUrl && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Sanitize LinkedIn URL for security
                        const url = mentor.linkedinUrl;
                        if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      data-testid={`button-linkedin-${mentor.id}`}
                    >
                      <LinkedinIcon className="w-3 h-3 mr-1" />
                      {t("card.linkedin")}
                    </Button>
                    )}
                    
                  </div>
                  
                  {/* Only participants can book sessions (the server rejects other roles) */}
                  {isParticipant && (
                    <Button
                      size="sm"
                      disabled={mentor.isAvailable === false}
                      onClick={() => setSelectedMentorForBooking(mentor)}
                      data-testid={`button-schedule-${mentor.id}`}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {t("card.schedule")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMentors.length === 0 && (
          <div className="rounded-xl border border-dashed border-steel/50 p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg mb-2">{t("empty.title")}</h3>
              <p className="text-muted-foreground">{t("empty.body")}</p>
          </div>
        )}

        {/* Mentorship Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 font-display font-medium">
              <Award className="w-5 h-5" />
              <span>{t("tips.title")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-11 h-11 bg-secondary text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-medium mb-2">{t("tips.prepared.title")}</h4>
                <p className="text-sm text-muted-foreground">{t("tips.prepared.body")}</p>
              </div>
              
              <div className="text-center">
                <div className="w-11 h-11 bg-secondary text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h4 className="font-medium mb-2">{t("tips.responsive.title")}</h4>
                <p className="text-sm text-muted-foreground">{t("tips.responsive.body")}</p>
              </div>
              
              <div className="text-center">
                <div className="w-11 h-11 bg-secondary text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-medium mb-2">{t("tips.appreciation.title")}</h4>
                <p className="text-sm text-muted-foreground">{t("tips.appreciation.body")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Booking Dialog */}
        {selectedMentorForBooking && (
          <SessionBookingDialog
            mentor={selectedMentorForBooking}
            isOpen={!!selectedMentorForBooking}
            onClose={() => setSelectedMentorForBooking(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
