import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { intlLocale } from "@/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Investor } from "@shared/schema";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getApiErrorMessage } from "@/lib/utils";
import {
  TrendingUp,
  Search,
  Calendar,
  DollarSign,
  Building,
  Users,
  Star,
  Eye,
  MessageSquare,
  Filter,
  Download,
  ExternalLink,
  Play,
  FileText,
  Mail,
  Phone
} from "lucide-react";

type ExtendedInvestor = Investor;

type InvestorsT = TFunction<["investors", "common"]>;

/** Stable catalog key for a stored value, e.g. "Web3/Blockchain" -> "web3_blockchain". */
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/**
 * Display labels for stored values (project stages, sectors, funding stages, geography).
 * Stored values never change; unknown values are shown as written.
 */
function useValueLabels() {
  const { t, i18n } = useTranslation(["investors", "common"]);
  const lookup = useCallback(
    (key: string, fallback: string) => (i18n.exists(key) ? String(t(key as never)) : fallback),
    [t, i18n],
  );
  return useMemo(
    () => ({
      stage: (stage: string) => lookup(`common:projectStage.${stage}`, stage.replace(/_/g, " ")),
      sector: (sector: string) => lookup(`investors:sectors.${slug(sector)}`, sector),
      fundingStage: (stage: string) => lookup(`investors:fundingStages.${slug(stage)}`, stage),
      geography: (region: string) => lookup(`investors:geography.${slug(region)}`, region),
    }),
    [lookup],
  );
}

const SESSION_TYPES = ["pitch", "feedback", "due_diligence", "demo_day"] as const;
const DURATIONS = [30, 60, 90, 120];

// Session booking form schema (messages follow the UI language)
const investorSessionBookingSchema = (t: InvestorsT) =>
  z.object({
    title: z.string().min(5, t("booking.validation.titleMin")),
    agenda: z.string().min(10, t("booking.validation.agendaMin")),
    startTime: z.string().min(1, t("booking.validation.startTimeRequired")),
    duration: z
      .number()
      .min(30, t("booking.validation.durationMin"))
      .max(120, t("booking.validation.durationMax"))
      .default(60),
    sessionType: z.string().default("pitch"),
  });

type InvestorSessionBookingFormData = z.infer<ReturnType<typeof investorSessionBookingSchema>>;

// Investor Session Booking Dialog Component
function InvestorSessionBookingDialog({ investor, isOpen, onClose }: { 
  investor: ExtendedInvestor; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation(["investors", "common"]);
  const schema = useMemo(() => investorSessionBookingSchema(t), [t]);
  
  const form = useForm<InvestorSessionBookingFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      agenda: "",
      startTime: "",
      duration: 60,
      sessionType: "pitch",
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
    mutationFn: async (data: InvestorSessionBookingFormData) => {
      const endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60 * 1000).toISOString();
      
      return apiRequest("POST", "/api/investor-sessions/book", {
        investorId: investor.id,
        title: data.title,
        agenda: data.agenda,
        startTime: new Date(data.startTime).toISOString(),
        endTime: endTime,
        sessionType: data.sessionType,
      });
    },
    onSuccess: () => {
      toast({
        title: t("toast.booked.title"),
        description: t("toast.booked.description", { name: investor.organization }),
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/sessions"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: t("toast.bookFailed.title"),
        description: getApiErrorMessage(error, t("toast.bookFailed.description")),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvestorSessionBookingFormData) => {
    bookSession.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("booking.title", { name: investor.organization })}</DialogTitle>
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
                      data-testid={`input-session-title-${investor.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.typeLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-session-type-${investor.id}`}>
                        <SelectValue placeholder={t("booking.typePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SESSION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`booking.types.${type}`)}
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
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("booking.slotLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-timeslot-${investor.id}`}>
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
                      <SelectTrigger data-testid={`select-duration-${investor.id}`}>
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
                      data-testid={`textarea-session-agenda-${investor.id}`}
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
                data-testid={`button-cancel-booking-${investor.id}`}
              >
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={bookSession.isPending}
                className="flex-1"
                data-testid={`button-confirm-booking-${investor.id}`}
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

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedTab, setSelectedTab] = useState("directory");
  const [selectedInvestorForBooking, setSelectedInvestorForBooking] = useState<ExtendedInvestor | null>(null);
  const [meetingMessages, setMeetingMessages] = useState<Record<string, string>>({});
  // Which startup's meeting dialog is open (null = none).
  const [meetingDialogFor, setMeetingDialogFor] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation(["investors", "common"]);
  const labels = useValueLabels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if user is investor vs participant/other
  const isInvestor = user?.role === "investor";
  // Only participants can book investor sessions (the server rejects other roles)
  const canBookSessions = user?.role === "participant";

  // Fetch startup projects for directory
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch investors (for admin/participant view)
  const { data: investors = [], isLoading: investorsLoading } = useQuery<any[]>({
    queryKey: ["/api/investors"],
    enabled: !isInvestor,
  });

  const displayStartups = projects;
  // The directory only lists investors that are currently active
  const displayInvestors = investors.filter((investor: any) => investor?.isActive !== false);

  // Request meeting mutation
  const requestMeeting = useMutation({
    mutationFn: async ({ startupId, message }: { startupId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/investor/meetings", {
        startupId,
        message
      });
      return response.json();
    },
    onSuccess: () => {
      setMeetingDialogFor(null);
      toast({
        title: t("toast.meetingRequested.title"),
        description: t("toast.meetingRequested.description"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/interests"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("toast.sessionExpired.title"),
          description: t("toast.sessionExpired.description"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("toast.requestFailed.title"),
        description: getApiErrorMessage(error, t("toast.requestFailed.description")),
        variant: "destructive",
      });
    }
  });

  const filteredStartups = displayStartups.filter((startup: any) => {
    const name = startup?.name || "";
    const sector = startup?.aiComponents?.[0] || "";
    const description = startup?.summary || "";
    const stage = startup?.stage || "";
    
    const matchesSearch = searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSector === "all" || sector === selectedSector;
    const matchesStage = selectedStage === "all" || stage === selectedStage;

    return matchesSearch && matchesSector && matchesStage;
  });

  const filteredInvestors = displayInvestors.filter((investor: any) => {
    const organization = investor?.organization || "";
    const sectors = investor?.sectors || [];
    
    const matchesSearch = searchQuery === "" ||
      organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sectors.some((sector: string) => sector.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Projects have no sector field; their primary AI component is used as the sector
  const sectors = Array.from(
    new Set(displayStartups.map((startup: any) => startup?.aiComponents?.[0]).filter(Boolean) as string[])
  ).sort();
  const stages = ["ideation", "validation", "mvp_build", "pilot_traction", "pitch_ready"];

  if (projectsLoading || investorsLoading) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("page.loading")}>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={t("page.title")}
      subtitle={isInvestor ? t("page.subtitleInvestor") : t("page.subtitleParticipant")}
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="directory" data-testid="tab-startup-directory">
              {isInvestor ? t("tabs.startups") : t("tabs.investors")}
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">
              {t("tabs.events")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Search and Filters */}
            <div className="panel p-3 flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder={isInvestor ? t("filters.searchStartups") : t("filters.searchInvestors")}
                        className="pl-10"
                        aria-label={isInvestor ? t("filters.searchStartups") : t("filters.searchInvestors")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-directory"
                      />
                  </div>
                  
                  {isInvestor && (
                    <>
                      <Select value={selectedSector} onValueChange={setSelectedSector}>
                        <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.sectorLabel")} data-testid="select-sector-filter">
                          <SelectValue placeholder={t("filters.sectorPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("filters.allSectors")}</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector} value={sector}>{labels.sector(sector)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedStage} onValueChange={setSelectedStage}>
                        <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.stageLabel")} data-testid="select-stage-filter">
                          <SelectValue placeholder={t("filters.stagePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("filters.allStages")}</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {labels.stage(stage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
            </div>

            {/* Directory Content */}
            {isInvestor ? (
              // Startup Directory for Investors
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups.map((startup: any) => (
                  <Card key={startup.id} className="transition-colors hover:border-accent/40">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                          <Avatar className="h-11 w-11 shrink-0 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-display">
                              {(startup.name || "S").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <CardTitle className="font-display text-lg font-medium break-words" data-testid={`startup-name-${startup.id}`}>
                              {startup.name}
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {startup.aiComponents?.[0] && (
                            <Badge variant="secondary" data-testid={`startup-sector-${startup.id}`}>
                              {labels.sector(startup.aiComponents[0])}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline"
                            className={`${
                              startup.stage === 'pitch_ready' ? 'border-success/40 bg-success/10 text-success' :
                              startup.stage === 'mvp_build' ? 'border-primary/30 text-primary' :
                              'border-accent/40 text-accent'
                            }`}
                            data-testid={`startup-stage-${startup.id}`}
                          >
                            {labels.stage(startup.stage || "ideation")}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`startup-description-${startup.id}`}>
                        {startup.summary}
                      </p>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-display text-muted-foreground">{t("startup.readiness")}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-1.5 bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${startup.readinessScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="font-display font-medium" data-testid={`startup-readiness-${startup.id}`}>
                              {startup.readinessScore || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div />
                        <div className="flex space-x-2">
                          <Dialog
                            open={meetingDialogFor === startup.id}
                            onOpenChange={(open) => setMeetingDialogFor(open ? startup.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                data-testid={`button-request-meeting-${startup.id}`}
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                {t("startup.meet")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("meeting.title", { name: startup.name })}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea 
                                  placeholder={t("meeting.placeholder")}
                                  className="min-h-[100px]"
                                  value={meetingMessages[startup.id] ?? ""}
                                  onChange={(e) => setMeetingMessages(prev => ({ ...prev, [startup.id]: e.target.value }))}
                                  data-testid={`textarea-meeting-request-${startup.id}`}
                                />
                                <Button 
                                  className="w-full"
                                  onClick={() => requestMeeting.mutate({ 
                                    startupId: startup.id, 
                                    message: meetingMessages[startup.id]?.trim() || t("meeting.defaultMessage") 
                                  })}
                                  disabled={requestMeeting.isPending}
                                  data-testid={`button-send-meeting-request-${startup.id}`}
                                >
                                  {requestMeeting.isPending ? t("meeting.sending") : t("meeting.send")}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Investor Directory for Participants
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInvestors.map((investor: any) => (
                  <Card key={investor.id} className="transition-colors hover:border-accent/40">
                    <CardHeader>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-11 w-11 shrink-0 rounded-lg bg-primary text-primary-foreground font-display flex items-center justify-center"
                          aria-hidden="true"
                        >
                          {(investor.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="font-display text-lg font-medium break-words" data-testid={`investor-name-${investor.id}`}>
                            {investor.organization}
                          </CardTitle>
                          {investor.contactEmail && (
                            <p className="text-sm text-muted-foreground break-all" data-testid={`investor-description-${investor.id}`}>
                              {investor.contactEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-sm text-muted-foreground mb-2">{t("investor.focus")}</h4>
                          <div className="flex flex-wrap gap-1">
                            {(investor.sectors || []).map((sector: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {labels.sector(sector)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-display text-muted-foreground">{t("investor.checkSize")}</span>
                            <p className="font-medium" data-testid={`investor-check-size-${investor.id}`}>
                              {investor.checkSize || t("investor.notSpecified")}
                            </p>
                          </div>
                          <div>
                            <span className="font-display text-muted-foreground">{t("investor.geography")}</span>
                            <p className="font-medium">
                              {(investor.geography || []).length > 0
                                ? investor.geography.map((region: string) => labels.geography(region)).join(", ")
                                : t("investor.notSpecified")}
                            </p>
                          </div>
                        </div>
                        
                        {(investor.stages || []).length > 0 && (
                          <div>
                            <h4 className="font-display text-sm text-muted-foreground mb-2">{t("investor.stages")}</h4>
                            <div className="flex flex-wrap gap-1">
                              {investor.stages.map((stage: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {labels.fundingStage(stage)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                          <Button 
                            size="sm"
                            variant="outline"
                            disabled={!investor.contactEmail}
                            onClick={() => { if (investor.contactEmail) window.location.href = `mailto:${investor.contactEmail}`; }}
                            data-testid={`button-contact-investor-${investor.id}`}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            {t("investor.contact")}
                          </Button>
                          {canBookSessions && (
                            <Button 
                              size="sm"
                              onClick={() => setSelectedInvestorForBooking(investor)}
                              data-testid={`button-book-session-${investor.id}`}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {t("investor.book")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {((isInvestor && filteredStartups.length === 0) || (!isInvestor && filteredInvestors.length === 0)) && (
              <div className="rounded-xl border border-dashed border-steel/50 p-8 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg mb-2">
                    {isInvestor ? t("empty.startups") : t("empty.investors")}
                  </h3>
                  <p className="text-muted-foreground">{t("empty.body")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="rounded-xl border border-dashed border-steel/50 p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2" data-testid="events-empty-title">
                  {t("events.emptyTitle")}
                </h3>
                <p className="text-muted-foreground">{t("events.emptyBody")}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Investor Session Booking Dialog */}
      {selectedInvestorForBooking && (
        <InvestorSessionBookingDialog
          investor={selectedInvestorForBooking}
          isOpen={!!selectedInvestorForBooking}
          onClose={() => setSelectedInvestorForBooking(null)}
        />
      )}
    </AppLayout>
  );
}
