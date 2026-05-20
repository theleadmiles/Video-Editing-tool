import { LegalLayout } from "@/components/shared/legal-layout";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Boltcut.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 2025">
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
        <p>By accessing or using Boltcut, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">2. Use of Service</h2>
        <p>Boltcut is an AI-powered video creation platform. You may use the service to create, edit, and export videos for personal or commercial purposes, subject to the restrictions below.</p>
        <p className="mt-2">You agree not to use Boltcut to create content that is illegal, harmful, defamatory, or violates the rights of others.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">3. Credits and Billing</h2>
        <p>Boltcut operates on a credit-based system. Free accounts receive 3 credits per month. Paid plans receive additional credits as described in our pricing. Credits do not roll over between billing periods.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">4. Intellectual Property</h2>
        <p>You retain ownership of any content you create using Boltcut. By using our service, you grant us a limited license to process your content solely for the purpose of providing the service.</p>
        <p className="mt-2">Stock footage is sourced from Pexels and is subject to the Pexels License. Background music is sourced from Pixabay and is subject to the Pixabay Content License.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">5. Limitation of Liability</h2>
        <p>Boltcut is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">6. Governing Law</h2>
        <p>These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Mumbai, Maharashtra.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:support@boltcut.ai" className="text-gold-500 hover:underline">support@boltcut.ai</a>.</p>
      </section>
    </LegalLayout>
  );
}
