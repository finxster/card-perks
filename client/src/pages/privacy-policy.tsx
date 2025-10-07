import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="bg-background">{/* Removed min-h-screen since footer handles layout */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  CardPerks collects information you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Account information (name, email address, password)</li>
                  <li>Credit card information you choose to track</li>
                  <li>Perk and benefit information you add</li>
                  <li>Usage data and preferences</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Send you technical notices and security alerts</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to enhance user experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
                <p className="text-muted-foreground">
                  We do not sell, rent, or share your personal information with third parties except:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and prevent fraud</li>
                  <li>In connection with a business transfer</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. However, no internet 
                  transmission is completely secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your information for as long as your account is active or as needed to 
                  provide services. You may request deletion of your account and associated data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Access and update your personal information</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request a copy of your data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
                <p className="text-muted-foreground">
                  We use cookies and similar technologies to improve your experience, analyze usage, 
                  and remember your preferences. You can control cookie settings through your browser.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  CardPerks is not intended for children under 13. We do not knowingly collect 
                  personal information from children under 13.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. We will notify you of any 
                  changes by posting the new privacy policy on this page and updating the "last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this privacy policy, please contact us at:
                </p>
                <p className="text-muted-foreground mt-2">
                  <strong>FinxSoft Apps</strong><br />
                  Email: privacy@finxsoft.com
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}