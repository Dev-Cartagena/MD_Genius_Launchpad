import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/Layout/AppLayout";
import MentorProfileForm from "@/components/Mentor/MentorProfileForm";
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

export default function MentorProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("profile");

  // Fetch mentor profile
  const { data: mentorProfile, isLoading: profileLoading, error: profileError } = useQuery<MentorProfile>({
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
      title: "Success!",
      description: "Your mentor profile has been updated successfully.",
    });
  };

  if (profileLoading) {
    return (
      <AppLayout 
        title="Mentor Profile" 
        subtitle="Manage your mentoring profile and sessions"
      >
        <div className="space-y-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading your profile...</p>
              </div>
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
        title="Setup Mentor Profile" 
        subtitle="Create your mentor profile to start connecting with participants"
      >
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>Welcome to the Mentor Program!</span>
              </CardTitle>
              <p className="text-muted-foreground">
                Set up your mentor profile to start connecting with participants in the AI startup accelerator program.
                Your profile will help participants find the right mentor for their needs.
              </p>
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
      title="Mentor Profile" 
      subtitle="Manage your mentoring profile and sessions"
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {isEditing ? (
              <MentorProfileForm 
                onComplete={handleProfileComplete} 
                isEditing={true} 
              />
            ) : (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{user?.firstName} {user?.lastName}</span>
                          {mentorProfile?.isActive ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-profile"
                      className="flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Bio Section */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center space-x-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span>About</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {mentorProfile?.bio || "No bio provided"}
                    </p>
                  </div>


                  {/* Expertise */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                      <Star className="w-5 h-5 text-primary" />
                      <span>Areas of Expertise</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile?.expertise?.length ? mentorProfile.expertise.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1">
                          {skill}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">No expertise areas specified</p>
                      )}
                    </div>
                  </div>

                  {/* Industries */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Industry Focus</h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile?.industries?.length ? mentorProfile.industries.map((industry) => (
                        <Badge key={industry} variant="outline" className="px-3 py-1">
                          {industry}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">No industry focus specified</p>
                      )}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-accent" />
                      <span>Availability</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(mentorProfile?.availability) && mentorProfile.availability.length ? mentorProfile.availability.map((time: string) => (
                        <Badge key={time} variant="secondary" className="px-3 py-1">
                          {time}
                        </Badge>
                      )) : (
                        <p className="text-muted-foreground">No availability specified</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span>My Mentoring Sessions</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your upcoming and past mentoring sessions
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {sessionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2 text-sm">Loading sessions...</p>
                    </div>
                  ) : !Array.isArray(mentorSessions) || mentorSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No mentoring sessions scheduled yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Participants will be able to book sessions with you once your profile is active
                      </p>
                    </div>
                  ) : (
                    mentorSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.scheduledTime).toLocaleDateString()} at {' '}
                            {new Date(session.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.participantIds?.length || 0} participant(s)
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              session.status === 'completed' ? 'default' : 
                              session.status === 'confirmed' ? 'secondary' : 'outline'
                            }
                          >
                            {session.status}
                          </Badge>
                          <Button variant="outline" size="sm" data-testid={`button-view-session-${session.id}`}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))
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