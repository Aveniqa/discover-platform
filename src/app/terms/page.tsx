import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "Read the terms and conditions governing your use of the Surfaced platform and services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <article>
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
              Legal
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Terms of{" "}
              <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
                Service
              </span>
            </h1>
            <p className="mt-4 text-muted">Last updated: April 2026</p>
          </header>

          {/* Content */}
          <div className="space-y-12">
            {/* Acceptance */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Acceptance of Terms
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  By accessing or using Surfaced (&quot;the Service&quot;), you
                  agree to be bound by these Terms of Service
                  (&quot;Terms&quot;). If you do not agree to these Terms, you
                  may not access or use the Service. These Terms apply to all
                  visitors, users, and others who access or use the Service.
                </p>
                <p>
                  We reserve the right to update or modify these Terms at any
                  time. Continued use of the Service after changes are posted
                  constitutes acceptance of the revised Terms.
                </p>
              </div>
            </div>

            {/* Use of Service */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Use of the Service
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  Surfaced provides curated content, product recommendations, and
                  discovery tools for informational and entertainment purposes.
                  You agree to use the Service only for lawful purposes and in
                  accordance with these Terms.
                </p>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Use the Service in any way that violates applicable local,
                    state, national, or international law
                  </li>
                  <li>
                    Attempt to gain unauthorized access to any portion of the
                    Service or any related systems or networks
                  </li>
                  <li>
                    Scrape, crawl, or otherwise extract content from the Service
                    through automated means without our express written permission
                  </li>
                  <li>
                    Interfere with or disrupt the integrity or performance of the
                    Service
                  </li>
                  <li>
                    Impersonate any person or entity, or falsely state or
                    misrepresent your affiliation with a person or entity
                  </li>
                </ul>
              </div>
            </div>

            {/* Intellectual Property */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Intellectual Property
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  The Service and its original content, features, and
                  functionality are owned by Surfaced and are protected by
                  international copyright, trademark, patent, trade secret, and
                  other intellectual property laws.
                </p>
                <p>
                  You may share links to our content freely. However, you may not
                  reproduce, distribute, modify, create derivative works of, or
                  publicly display our content without prior written permission.
                  Brief excerpts for the purpose of commentary, criticism, or
                  news reporting are permitted under fair use.
                </p>
              </div>
            </div>

            {/* Affiliate Links */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Affiliate Links & Product Recommendations
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  Surfaced contains affiliate links. When you click on these links
                  and make a purchase, we may receive a commission at no
                  additional cost to you. This helps support our editorial
                  operations.
                </p>
                <p>
                  Our product recommendations are based on editorial merit. The
                  presence of affiliate links does not influence which products we
                  feature or how we review them. For full details, please see our{" "}
                  <a
                    href="/affiliate-disclosure"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    Affiliate Disclosure
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Disclaimer of Warranties
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  The Service is provided on an &quot;as is&quot; and &quot;as
                  available&quot; basis without warranties of any kind, whether
                  express or implied, including but not limited to implied
                  warranties of merchantability, fitness for a particular purpose,
                  and non-infringement.
                </p>
                <p>
                  We do not warrant that the Service will be uninterrupted,
                  secure, or error-free. Product recommendations and content are
                  provided for informational purposes and should not be
                  considered professional advice.
                </p>
              </div>
            </div>

            {/* Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Limitation of Liability
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  To the fullest extent permitted by applicable law, Surfaced and
                  its officers, directors, employees, and agents shall not be
                  liable for any indirect, incidental, special, consequential, or
                  punitive damages, including but not limited to loss of profits,
                  data, use, goodwill, or other intangible losses, resulting
                  from:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your access to or use of (or inability to use) the Service</li>
                  <li>
                    Any conduct or content of any third party on the Service
                  </li>
                  <li>
                    Any content obtained from the Service, including product
                    recommendations
                  </li>
                  <li>
                    Unauthorized access, use, or alteration of your data or
                    transmissions
                  </li>
                </ul>
              </div>
            </div>

            {/* Modifications */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Modifications to the Service
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  We reserve the right to modify, suspend, or discontinue the
                  Service (or any part thereof) at any time, with or without
                  notice. We shall not be liable to you or any third party for
                  any modification, suspension, or discontinuance of the Service.
                </p>
              </div>
            </div>

            {/* Governing Law */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Governing Law
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  These Terms shall be governed by and construed in accordance
                  with the laws of the United States, without regard to its
                  conflict of law provisions. Any disputes arising from these
                  Terms or your use of the Service shall be resolved in the
                  courts of competent jurisdiction.
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
                  If you have any questions about these Terms, please contact us:
                </p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:surfaced-x@protonmail.com"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    surfaced-x@protonmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
