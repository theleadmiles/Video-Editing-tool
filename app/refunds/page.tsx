import { LegalLayout } from "@/components/shared/legal-layout";

export const metadata = {
  title: "Refund Policy",
  description: "Boltcut subscription and credit refund terms.",
};

export default function RefundsPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="May 2025">
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">1. Subscription Refunds</h2>
        <p>If you are not satisfied with your Boltcut subscription, you may request a full refund within 7 days of your initial purchase. After 7 days, no refunds will be issued for the current billing period.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">2. Credit Purchases</h2>
        <p>Purchased AI credits are non-refundable once used. If you have unused credits and would like a refund, please contact us within 14 days of purchase.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">3. How to Request a Refund</h2>
        <p>To request a refund, email us at <a href="mailto:support@boltcut.ai" className="text-gold-500 hover:underline">support@boltcut.ai</a> with your account email and order details. We will process your request within 5-7 business days.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">4. Technical Issues</h2>
        <p>If you experienced a technical issue that prevented you from using the service (e.g., a video failed to generate due to our error), we will issue a credit refund regardless of the time elapsed.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">5. Contact</h2>
        <p>For refund-related queries, reach us at <a href="mailto:support@boltcut.ai" className="text-gold-500 hover:underline">support@boltcut.ai</a>.</p>
      </section>
    </LegalLayout>
  );
}
