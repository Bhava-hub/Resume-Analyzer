import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — CareerStrategist',
  description: 'Terms of Service for using the CareerStrategist application.',
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-sm text-on-surface-variant">
              Last updated: June 24, 2026
            </p>
          </div>

          {/* Policy Card */}
          <div className="bg-surface-container-low p-8 md:p-10 rounded-2xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(46,50,48,0.04)] space-y-8">
            
            {/* Core Agreement Callout */}
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary-fixed/20 to-surface-container p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 22 }}>gavel</span>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-primary font-label">
                    Agreement
                  </h2>
                  <p className="text-base font-bold text-on-surface mt-1 leading-relaxed">
                    By using CareerStrategist you agree to these terms.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. What CareerStrategist does */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">1.</span>
                What CareerStrategist does
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                CareerStrategist is a free career tool that analyzes your resume against a job description and provides gap analysis, a personalized roadmap, relevant YouTube resources, and real Reddit career stories.
              </p>
            </section>

            {/* 2. Your content */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">2.</span>
                Your content
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                When you upload your resume and job description, that content is processed in memory to generate your analysis and immediately discarded. We do not store, sell, or share your resume or job description with anyone except the AI processing pipeline required to generate your results.
              </p>
            </section>

            {/* 3. Third party content */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">3.</span>
                Third party content
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                CareerStrategist surfaces content from YouTube and Reddit. We do not own that content. All YouTube videos link directly to YouTube. All Reddit stories link directly to Reddit. We are not responsible for third party content.
              </p>
            </section>

            {/* 4. No guarantees */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">4.</span>
                No guarantees
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                CareerStrategist provides career guidance based on AI analysis. We do not guarantee job placement, interview success, or any specific career outcome. The analysis is a tool to help you make informed decisions, not a substitute for professional career advice.
              </p>
            </section>

            {/* 5. Free to use */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">5.</span>
                Free to use
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                CareerStrategist is currently free. If we introduce paid features in the future we will notify users clearly before any charges occur.
              </p>
            </section>

            {/* 6. Acceptable use */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">6.</span>
                Acceptable use
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                You agree not to use CareerStrategist to upload content that is illegal, harmful, or violates the rights of others. You agree not to attempt to reverse engineer, scrape, or abuse the service.
              </p>
            </section>

            {/* 7. Limitation of liability */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">7.</span>
                Limitation of liability
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                CareerStrategist is provided as-is. We are not liable for any damages arising from your use of the service.
              </p>
            </section>

            {/* 8. Changes */}
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'Literata, serif' }}>
                <span className="text-primary text-sm font-bold font-label">8.</span>
                Changes
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We may update these terms occasionally. Continued use of the service after changes means you accept the new terms.
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
          CareerStrategist — <a href="https://resume-analyzer-s1mq.onrender.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">https://resume-analyzer-s1mq.onrender.com/</a>
        </p>
      </footer>
    </div>
  );
}
