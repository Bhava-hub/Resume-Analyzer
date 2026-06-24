import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — CareerStrategist',
  description: "CareerStrategist Privacy Policy: We don't collect, store, or sell your personal data. Ever.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-mesh min-h-screen flex flex-col text-on-surface">
      {/* Fixed Top Nav */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-8 h-16 bg-surface-container-lowest shadow-[0px_4px_12px_rgba(46,50,48,0.06)]">
        <Link
          href="/"
          className="text-lg font-bold text-primary tracking-tight font-headline hover:opacity-80 transition-opacity no-underline"
          style={{ fontFamily: 'Literata, serif' }}
        >
          CareerStrategist
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors no-underline"
        >
          <span className="material-symbols-outlined text-base" style={{ fontSize: 16 }}>arrow_back</span>
          Back to App
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-grow pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-3xl mx-auto animate-fade-in-up">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3" style={{ fontFamily: 'Literata, serif' }}>
              Privacy Policy
            </h1>
            <p className="text-sm text-on-surface-variant">
              Last updated: June 24, 2026
            </p>
          </div>

          {/* Policy Card */}
          <div className="bg-surface-container-low p-8 md:p-10 rounded-2xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(46,50,48,0.04)] space-y-8">

            {/* The Short Version Callout */}
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary-fixed/20 to-surface-container p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 22 }}>verified_user</span>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-primary font-label">
                    The short version
                  </h2>
                  <p className="text-base font-bold text-on-surface mt-1 leading-relaxed">
                    We don&apos;t collect, store, or sell your personal data. Ever.
                  </p>
                </div>
              </div>
            </div>

            {/* What we do with your data */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 animate-fade-in-up" style={{ fontFamily: 'Literata, serif' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>security</span>
                What we do with your data
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                When you upload your resume and job description, that text is sent directly to our AI analysis pipeline and immediately discarded after your results are generated. We do not store your resume. We do not store your job description. We do not store your analysis results.
              </p>
            </section>

            {/* Third party services */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>cloud_queue</span>
                Third party services we use
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We work with the following subprocessors to power our application:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 mt-2">
                <li className="p-4 rounded-xl bg-surface-container border border-outline-variant/10 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 18 }}>psychology</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">Groq AI</span>
                    <span className="text-[11px] text-on-surface-variant leading-normal">Processes resume & job description to generate analysis.</span>
                  </div>
                </li>
                <li className="p-4 rounded-xl bg-surface-container border border-outline-variant/10 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 18 }}>play_circle</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">Google YouTube Data API</span>
                    <span className="text-[11px] text-on-surface-variant leading-normal">Fetches relevant video resources based on skill gaps.</span>
                  </div>
                </li>
                <li className="p-4 rounded-xl bg-surface-container border border-outline-variant/10 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 18 }}>forum</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">Reddit API</span>
                    <span className="text-[11px] text-on-surface-variant leading-normal">Fetches relevant career journeys based on target role.</span>
                  </div>
                </li>
                <li className="p-4 rounded-xl bg-surface-container border border-outline-variant/10 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 18 }}>dns</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">Render</span>
                    <span className="text-[11px] text-on-surface-variant leading-normal">Hosts and serves the application platform.</span>
                  </div>
                </li>
              </ul>
              <p className="text-xs text-on-surface-variant/80 mt-2 leading-relaxed italic">
                * Each of these services has their own privacy policy. We recommend reviewing them if you have concerns.
              </p>
            </section>

            {/* Cookies */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>cookie</span>
                Cookies
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We use only essential session cookies to keep the app functioning. We do not use tracking cookies, advertising cookies, or analytics cookies.
              </p>
            </section>

            {/* Children */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>face</span>
                Children
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                This service is accessible to users of all ages. We do not collect personal data from any user regardless of age.
              </p>
            </section>

            {/* Changes */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>update</span>
                Changes
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                If we ever start collecting data in the future, we will update this policy and notify users prominently.
              </p>
            </section>

          </div>

          {/* Footer Link */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold"
            >
              CareerStrategist Home
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-outline-variant/20">
        <p className="text-on-surface-variant text-sm">
          CareerStrategist — <a href="https://resume-analyzer-s1mq.onrender.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">https://resume-analyzer-s1mq.onrender.com/privacy</a>
        </p>
      </footer>
    </div>
  );
}
