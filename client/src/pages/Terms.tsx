import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Terms and Conditions</h1>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>MD Genius AI Startup Launchpad - Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: September 12, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By applying to and participating in the MD Genius AI Startup Launchpad ("Program"), 
                you agree to be bound by these Terms and Conditions. If you do not agree to these 
                terms, please do not apply or participate in the Program.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Program Description</h2>
              <p>
                The MD Genius AI Startup Launchpad is an 8-week intensive accelerator program 
                designed to help entrepreneurs develop AI-powered startups. The Program includes 
                mentorship, curriculum, networking opportunities, and potential funding opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Eligibility and Application</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Applicants must be at least 18 years old</li>
                <li>All application information must be accurate and truthful</li>
                <li>MD Genius reserves the right to verify all submitted information</li>
                <li>Admission to the Program is competitive and at the sole discretion of MD Genius</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
              <p>
                Participants retain ownership of their intellectual property developed prior to 
                the Program. Any IP developed during the Program remains with the participant, 
                however MD Genius may request a right of first refusal for investment opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Confidentiality and Non-Disclosure</h2>
              <p>
                Participants may be exposed to confidential information during the Program. 
                You agree to maintain the confidentiality of all proprietary information shared 
                by MD Genius, mentors, and other participants.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Code of Conduct</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Treat all participants, mentors, and staff with respect</li>
                <li>Maintain professional behavior at all times</li>
                <li>No harassment, discrimination, or inappropriate conduct will be tolerated</li>
                <li>Follow all Program guidelines and deadlines</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Commitment Requirements</h2>
              <p>
                Participants are expected to dedicate significant time and effort to the Program. 
                Failure to meet participation requirements may result in removal from the Program 
                without refund of any fees or forfeiture of any benefits.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p>
                MD Genius provides the Program "as is" and makes no guarantees regarding outcomes, 
                funding, or business success. Participation is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
              <p>
                MD Genius reserves the right to terminate any participant's involvement in the 
                Program for violation of these terms, failure to meet Program requirements, or 
                any other reason deemed appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p>
                For questions regarding these Terms and Conditions, please contact us at:
                <br />
                Email: legal@mdgenius.ai
                <br />
                Address: MD Genius AI Launchpad, 123 Innovation Drive, San Francisco, CA 94105
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}