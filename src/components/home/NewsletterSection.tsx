import { NewsletterForm } from "@/components/ui/NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background treatment */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
          <span className="text-xs font-medium text-muted">Free newsletter, no spam, ever.</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
          Never miss what the
          <br />
          <span className="gradient-text">internet surfaced.</span>
        </h2>

        <p className="mt-5 text-muted text-lg max-w-lg mx-auto leading-relaxed">
          Join thousands of curious readers who start their morning with our daily email — the best discoveries, products, and future tech in 5 minutes.
        </p>

        <div className="mt-8 flex justify-center">
          <NewsletterForm />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Unsubscribe anytime
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            5-minute daily read
          </span>
        </div>
      </div>
    </section>
  );
}
