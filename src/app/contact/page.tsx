"use client";

import { useState } from "react";

// Metadata must be in a separate file for client components, or use generateMetadata
// For simplicity, we keep the metadata pattern and note it for layout usage.
// In production, move metadata to a layout.tsx or use generateMetadata in a server wrapper.

const contactChannels = [
  {
    title: "General Inquiries",
    description: "Questions, feedback, or just want to say hello.",
    email: "hello@surfaced.io",
  },
  {
    title: "Brand Partnerships",
    description:
      "Interested in partnering with Surfaced to reach our curious audience.",
    email: "partnerships@surfaced.io",
  },
  {
    title: "Advertising",
    description:
      "Sponsor our newsletter or place native ads across our platform.",
    email: "ads@surfaced.io",
  },
  {
    title: "Press & Media",
    description:
      "Journalist or blogger? We are happy to provide quotes, data, or interviews.",
    email: "press@surfaced.io",
  },
];

const partnershipBenefits = [
  "Reach a highly engaged audience of curious early adopters",
  "Native placements that feel organic, never intrusive",
  "Detailed performance reporting and analytics",
  "Flexible formats: newsletter sponsorship, featured products, branded content",
  "Dedicated partnership manager for every campaign",
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.message) {
      setSubmitted(true);
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
            Contact
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
            Let&apos;s{" "}
            <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
              connect
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed">
            Whether you have a question, a partnership idea, or just want to
            share something cool you found on the internet, we would love to hear
            from you.
          </p>
        </div>
      </section>

      {/* Contact Channels */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
            Get in touch
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {contactChannels.map((channel) => (
              <div
                key={channel.title}
                className="p-6 rounded-xl bg-surface-elevated border border-border/60"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {channel.title}
                </h3>
                <p className="text-muted text-sm mb-4">
                  {channel.description}
                </p>
                <a
                  href={`mailto:${channel.email}`}
                  className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  {channel.email}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 sm:py-28 border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Send us a message
          </h2>
          <p className="text-muted mb-8">
            Fill out the form below and we will get back to you within 48 hours.
          </p>

          {submitted ? (
            <div className="p-8 rounded-xl bg-surface border border-accent/20 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Message received
              </h3>
              <p className="text-muted">
                Thanks for reaching out. We will get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="What's this about?"
                  className="w-full px-4 py-3 rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us what's on your mind..."
                  className="w-full px-4 py-3 rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl btn-gradient text-sm cursor-pointer active:scale-[0.98]"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Partnerships */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Partner with Surfaced
          </h2>
          <p className="text-muted text-lg mb-10">
            We work with brands and products we genuinely believe in. Here is
            what a Surfaced partnership looks like.
          </p>

          <ul className="space-y-4">
            {partnershipBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-4">
                <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </span>
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <a
              href="mailto:partnerships@surfaced.io"
              className="inline-flex items-center gap-2 text-accent font-medium hover:text-accent/80 transition-colors"
            >
              Reach out about partnerships
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
