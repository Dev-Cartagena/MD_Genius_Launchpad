import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/Layout/AppLayout";
import { useTranslation } from "react-i18next";
import { intlLocale } from "@/i18n";
import MentorProfileForm, { useMentorOptionLabel } from "@/components/Mentor/MentorProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Edit, 
  Star, 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  MessageCircle,
  Users
} from "lucide-react";
import type { MentorProfile } from "@shared/schema";
import { BlockLoader } from "@/components/brand";

export default function MentorProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation(["mentors", "common"]);
  const optionLabel = useMentorOptionLabel();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("profile");

  // Fetch mentor profile
  const { data: mentorProfile, isLoading: profileLoading, error: profileError } = useQuery<MentorProfile | null>({
    queryKey: ['/api/mentor/profile'],
    enabled: !!user,
    retry: false,
  });

  // Fetch mentor sessions
  const { data: mentorSessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ['/api/mentor/sessions'],
    enabled: !!user,
  });

  const hasProfile = !!mentorProfile;

  const handleProfileComplete = () => {
    setIsEditing(false);
    toast({
      title: t("common:status.saved"),
      description: t("profile.savedToast"),
    });
  };

  if (profileLoading) {
    return (
      <AppLayout 
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
      >
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <BlockLoader label={t("profile.loading")} className="py-12" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // No profile exists - show setup form
  if (!hasProfile && !isEditing) {
    return (
      <AppLayout 
        title={t("profile.setup.title")}
        subtitle={t("profile.setup.subtitle")}
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 font-display font-medium">
                <User className="w-5 h-5" />
                <span>{t("profile.setup.welcomeTitle")}</span>
              </CardTitle>
              <p className="text-muted-foreground">{t("profile.setup.welcomeBody")}</p>
            </CardHeader>
          </Card>
          
          <MentorProfileForm onComplete={handleProfileComplete} isEditing={false} />
        </div>
      </AppLayout>
    );
  }

  // Show profile with tabs (Profile + Sessions)
  return (
    <AppLayout 
      title={t("profile.title")}
      subtitle={t("profile.subtitle")}
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList>
            <TabsTrigger value="profile" data-testid="tab-profile">{t("profile.tabs.profile")}</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">{t("profile.tabs.sessions")}</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {isEditing ? (
              <MentorProfileForm 
                onComplete={handleProfileComplete} 
                isEditing={true} 
              />
            ) : (
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 shrink-0 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-display text-base">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="flex flex-wrap items-center gap-2 font-display font-medium">
                          <span>{user?.firstName} {user?.lastName}</span>
                          {mentorProfile?.isActive ? (
                            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("profile.active")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {t("profile.inactive")}
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-profile"
                      className="flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{t("profile.edit")}</span>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Bio Section */}
                  <div className="lg:col-span-2">
                    <h3 className="font-display font-medium text-lg mb-2 flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>{t("profile.about")}</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {mentorProfile?.bio || t("profile.noBio")}
                    </p>
                  </div>


                  {/* Expertise */}
                  <div>
                    <h3 className="font-display font-medium text-lg mb-3 flex items-center space-x-2">
                      <Star className="w-5 h-5" />
                      <span>{t("profile.expertise")}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile?.expertise?.length ? mentorProfile.expertise.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1">
                          {optionLabel("expertise", skill)}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">{t("profile.noExpertise")}</p>
                      )}
                    </div>
                  </div>

                  {/* Industries */}
                  <div>
                    <h3 className="font-display font-medium text-lg mb-3">{t("profile.industries")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile?.industries?.length ? mentorProfile.industries.map((industry) => (
                        <Badge key={industry} variant="secondary" className="px-3 py-1">
                          {optionLabel("industries", industry)}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">{t("profile.noIndustries")}</p>
                      )}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <h3 className="font-display font-medium text-lg mb-3 flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>{t("profile.availability")}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(mentorProfile?.availability) && mentorProfile.availability.length ? mentorProfile.availability.map((time: string) => (
                        <Badge key={time} variant="secondary" className="px-3 py-1">
                          {optionLabel("availability", time)}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">{t("profile.noAvailability")}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 font-display font-medium">
                  <MessageCircle className="w-5 h-5" />
                  <span>{t("profile.sessions.title")}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("profile.sessions.description")}</p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {sessionsLoading ? (
                    <BlockLoader label={t("profile.sessions.loading")} className="py-8" />
                  ) : !Array.isArray(mentorSessions) || mentorSessions.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-steel/50">
                      <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-foreground">{t("profile.sessions.emptyTitle")}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t("profile.sessions.emptyBody")}</p>
                    </div>
                  ) : (
                    mentorSessions.map((session: { id: string; title: string; startTime: string; endTime: string; participantIds?: string[] | null; meetingLink?: string | null }) => {
                      // Sessions have no status column: derive it from the end time
                      const isCompleted = new Date(session.endTime).getTime() < Date.now();
                      return (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t("profile.sessions.when", {
                              date: new Date(session.startTime).toLocaleDateString(intlLocale()),
                              start: new Date(session.startTime).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" }),
                              end: new Date(session.endTime).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" }),
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("profile.sessions.participants", { count: session.participantIds?.length || 0 })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={isCompleted ? 'default' : 'outline'} className={isCompleted ? '' : 'border-accent/40 text-accent'}>
                            {isCompleted ? t("profile.sessions.completed") : t("profile.sessions.upcoming")}
                          </Badge>
                          {!isCompleted && session.meetingLink && (
                            <Button variant="outline" size="sm" asChild data-testid={`button-join-session-${session.id}`}>
                              <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">{t("profile.sessions.join")}</a>
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}