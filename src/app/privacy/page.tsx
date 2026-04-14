import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Surfaced",
  description:
    "Learn how Surfaced collects, uses, and protects your personal information.",
  openGraph: {
    title: "Privacy Policy — Surfaced",
    description:
      "Learn how Surfaced collects, uses, and protects your personal information.",
  },
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
              Legal
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Privacy{" "}
              <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="mt-4 text-muted">Last updated: April 2026</p>
          </header>

          {/* Content */}
          <div className="space-y-12">
            {/* Introduction */}
            <div>
              <p className="text-muted leading-relaxed">
                At Surfaced (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;),
                we take your privacy seriously. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your information when
                you visit our website and use our services. Please read this
                policy carefully. By using Surfaced, you agree to the collection
                and use of information in accordance with this policy.
              </p>
            </div>

            {/* Information Collection */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Information We Collect
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <span className="text-foreground font-medium">Email address</span>{" "}
                    — when you subscribe to our newsletter or create an account
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Usage data</span>{" "}
                    — pages visited, time spent, features used, and interactions
                    with our content
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Device information</span>{" "}
                    — browser type, operating system, device type, and screen
                    resolution
                  </li>
                  <li>
                    <span className="text-foreground font-medium">
                      Communication data
                    </span>{" "}
                    — when you contact us through our website or email
                  </li>
                </ul>
              </div>
            </div>

            {/* How We Use Information */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                How We Use Your Information
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Deliver and improve our daily discovery content</li>
                  <li>Send our newsletter and relevant updates</li>
                  <li>Personalize your experience on Surfaced</li>
                  <li>Analyze usage patterns to improve our platform</li>
                  <li>Communicate with you about your account or inquiries</li>
                  <li>Detect and prevent fraud or abuse</li>
                </ul>
              </div>
            </div>

            {/* Cookies */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Cookies & Tracking Technologies
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  We use cookies and similar tracking technologies to collect
                  usage data and improve our services. Cookies are small data
                  files stored on your device.
                </p>
                <p>We use the following types of cookies:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <span className="text-foreground font-medium">Essential cookies</span>{" "}
                    — required for basic site functionality
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Analytics cookies</span>{" "}
                    — help us understand how visitors interact with our site
                  </li>
                  <li>
                    <span className="text-foreground font-medium">
                      Preference cookies
                    </span>{" "}
                    — remember your settings and preferences
                  </li>
                </ul>
                <p>
                  You can control cookies through your browser settings. Disabling
                  certain cookies may limit your ability to use some features.
                </p>
              </div>
            </div>

            {/* Third Parties */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Third-Party Services
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  We may share limited information with trusted third-party
                  service providers who assist us in operating our platform,
                  including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email delivery services (for newsletter distribution)</li>
                  <li>Analytics providers (for usage insights)</li>
                  <li>Hosting and infrastructure providers</li>
                  <li>Affiliate network partners</li>
                </ul>
                <p>
                  These providers are contractually obligated to protect your data
                  and may only use it for the specific purposes we direct. We do
                  not sell your personal information to third parties.
                </p>
              </div>
            </div>

            {/* Data Security */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Data Security
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  We implement appropriate technical and organizational measures
                  to protect your personal information against unauthorized
                  access, alteration, disclosure, or destruction. However, no
                  method of transmission over the internet is 100% secure, and we
                  cannot guarantee absolute security.
                </p>
              </div>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Your Rights
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to or restrict certain processing activities</li>
                  <li>Request a portable copy of your data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p>
                  To exercise any of these rights, please contact us at{" "}
                  <a
                    href="mailto:privacy@surfaced.io"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    privacy@surfaced.io
                  </a>
                  . We will respond to your request within 30 days.
                </p>
              </div>
            </div>

            {/* GDPR */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                European Privacy Rights (GDPR)
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  If you are located in the European Economic Area (EEA), United
                  Kingdom, or Switzerland, you have additional rights under the
                  General Data Protection Regulation (GDPR), including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <span className="text-foreground font-medium">Right to be informed</span>{" "}
                    — you have the right to know how your data is collected and used
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to erasure</span>{" "}
                    — you can request that we delete your personal data
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to data portability</span>{" "}
                    — you can request your data in a structured, machine-readable format
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to lodge a complaint</span>{" "}
                    — you may file a complaint with your local data protection authority
                  </li>
                </ul>
                <p>
                  Our legal basis for processing your data includes: your consent,
                  our legitimate interests in operating and improving the service,
                  and compliance with legal obligations. We do not transfer your
                  data outside the EEA without appropriate safeguards.
                </p>
              </div>
            </div>

            {/* CCPA */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                California Privacy Rights (CCPA)
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  If you are a California resident, the California Consumer Privacy
                  Act (CCPA) provides you with additional rights regarding your
                  personal information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <span className="text-foreground font-medium">Right to know</span>{" "}
                    — you can request details about the categories and specific pieces
                    of personal information we have collected
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to delete</span>{" "}
                    — you can request deletion of your personal information
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to opt out</span>{" "}
                    — you can opt out of the sale of your personal information
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Right to non-discrimination</span>{" "}
                    — we will not discriminate against you for exercising your rights
                  </li>
                </ul>
                <p>
                  We do not sell your personal information. To exercise your CCPA
                  rights, contact us at{" "}
                  <a
                    href="mailto:privacy@surfaced.io"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    privacy@surfaced.io
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="pt-8 border-t border-border/60">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Contact Us
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  If you have any questions about this Privacy Policy or our data
                  practices, please contact us:
                </p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:privacy@surfaced.io"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    privacy@surfaced.io
                  </a>
                </p>
                <p>
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by posting the new policy on
                  this page and updating the &quot;Last updated&quot; date.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
