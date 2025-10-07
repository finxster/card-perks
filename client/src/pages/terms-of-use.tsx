import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfUse() {
  return (
    <div className="bg-background">{/* Removed min-h-screen since footer handles layout */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms of Use</CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using CardPerks ("the Service"), you accept and agree to be bound by 
                  the terms and provision of this agreement. If you do not agree to these terms, 
                  please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                <p className="text-muted-foreground">
                  CardPerks is a web application that helps users manage and track credit card benefits, 
                  perks, and rewards. The Service allows users to organize their credit card information 
                  and discover relevant benefits.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
                <p className="text-muted-foreground mb-4">
                  To use certain features of the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
                <p className="text-muted-foreground mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Share false, misleading, or inaccurate information</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Use the Service for any illegal or unauthorized purpose</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Financial Information Disclaimer</h2>
                <p className="text-muted-foreground">
                  CardPerks is not a financial institution and does not provide financial advice. 
                  The information provided is for organizational purposes only. Always verify credit card 
                  terms and benefits directly with your card issuer. We are not responsible for changes 
                  to card benefits or terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
                <p className="text-muted-foreground">
                  The Service and its original content, features, and functionality are owned by 
                  FinxSoft Apps and are protected by international copyright, trademark, patent, 
                  trade secret, and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. User Content</h2>
                <p className="text-muted-foreground">
                  You retain rights to any content you submit to the Service. However, by submitting 
                  content, you grant us a license to use, modify, and display that content in connection 
                  with the Service. You are responsible for ensuring you have the right to share any content you submit.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Privacy</h2>
                <p className="text-muted-foreground">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs 
                  your use of the Service, to understand our practices.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
                <p className="text-muted-foreground">
                  We strive to maintain the Service, but we do not guarantee that it will be available 
                  at all times. We may modify, suspend, or discontinue the Service at any time with or 
                  without notice.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, FinxSoft Apps shall not be liable for any 
                  indirect, incidental, special, consequential, or punitive damages, or any loss of 
                  profits or revenues, whether incurred directly or indirectly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
                <p className="text-muted-foreground">
                  You agree to defend, indemnify, and hold harmless FinxSoft Apps from and against any 
                  claims, damages, costs, and expenses arising from your use of the Service or violation 
                  of these terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend your account and access to the Service immediately, 
                  without prior notice, for conduct that we believe violates these terms or is harmful 
                  to other users, us, or third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
                <p className="text-muted-foreground">
                  These terms are governed by and construed in accordance with the laws of the jurisdiction 
                  where FinxSoft Apps is located, without regard to conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. We will notify users of any 
                  changes by posting the new terms on this page and updating the "last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">15. Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have any questions about these Terms of Use, please contact us at:
                </p>
                <p className="text-muted-foreground mt-2">
                  <strong>FinxSoft Apps</strong><br />
                  Email: legal@finxsoft.com
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}