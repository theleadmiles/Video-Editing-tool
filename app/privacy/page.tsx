import { LegalLayout } from "@/components/shared/legal-layout";

export const metadata = {
  title: "Privacy Policy",
  description: "How Boltcut collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 2025">
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
        <p>We collect information you provide directly to us when you create an account, use our services, or contact us for support. This includes your name, email address, and payment information (processed securely through Razorpay).</p>
        <p className="mt-2">We also automatically collect certain technical information when you use Boltcut, including your IP address, browser type, and usage data to improve our service.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
        <p>We use the information we collect to provide, maintain, and improve our services; process transactions; send you technical notices and support messages; and respond to your comments and questions.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage</h2>
        <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security policies. Videos and media files are stored in Supabase Storage. We do not sell your personal data to third parties.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Services</h2>
        <p>Boltcut integrates with ElevenLabs for voice generation, Pexels for stock footage, and Anthropic for AI features. Each of these services has its own privacy policy governing the use of your data.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">5. Your Rights</h2>
        <p>You can access, update, or delete your personal information at any time through your account settings. To delete your account permanently, contact us at support@boltcut.ai.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">6. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:support@boltcut.ai" className="text-gold-500 hover:underline">support@boltcut.ai</a>.</p>
      </section>
    </LegalLayout>
  );
}
