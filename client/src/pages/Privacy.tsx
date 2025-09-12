import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>MD Genius AI Startup Launchpad - Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: September 12, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <h3 className="text-lg font-medium mb-2">Personal Information</h3>
              <p>
                We collect personal information that you provide to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name, email address, phone number, and location</li>
                <li>Educational background and professional experience</li>
                <li>Business ideas and project information</li>
                <li>Resume, portfolio, and other application documents</li>
                <li>Communications with our team and other participants</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Evaluate your application for the Program</li>
                <li>Provide and improve our services</li>
                <li>Communicate with you about the Program</li>
                <li>Connect you with mentors and other participants</li>
                <li>Analyze and improve our Program effectiveness</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
              <p>
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>With Mentors:</strong> We share relevant information to facilitate mentorship</li>
                <li><strong>With Participants:</strong> Limited information for networking and collaboration</li>
                <li><strong>With Investors:</strong> With your explicit consent, for funding opportunities</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate the Program</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your 
                personal information against unauthorized access, alteration, disclosure, or 
                destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the 
                purposes outlined in this Privacy Policy, comply with legal obligations, 
                resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access and review your personal information</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal obligations)</li>
                <li>Object to or restrict processing of your information</li>
                <li>Data portability (receive your information in a structured format)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience 
                on our platform, analyze usage patterns, and improve our services. You can 
                control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Third-Party Services</h2>
              <p>
                Our platform may integrate with third-party services (like cloud storage, 
                analytics, or communication tools). These services have their own privacy 
                policies, which we encourage you to review.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of 
                any material changes by posting the updated policy on our platform and 
                updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, 
                please contact us at:
                <br />
                Email: privacy@mdgenius.ai
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