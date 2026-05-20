import Link from "next/link";
import { Logo } from "./logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Templates", href: "/templates" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refunds" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-base">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm text-subtle leading-relaxed">
              The AI-native video editor built for creators, marketers, and agencies in India and beyond.
            </p>
            <a
              href="mailto:support@boltcut.ai"
              className="mt-4 inline-block text-sm text-gold-500 hover:text-gold-400 transition-colors"
            >
              support@boltcut.ai
            </a>
          </div>
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="mb-4 text-sm font-semibold text-white">{section}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-subtle transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted md:flex-row">
          <p>© {new Date().getFullYear()} Boltcut. All rights reserved.</p>
          <p>Made with ⚡ in India</p>
        </div>
      </div>
    </footer>
  );
}
