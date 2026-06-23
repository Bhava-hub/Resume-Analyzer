import type { AnalysisResult } from '@/types/analysis';
import AnalysisSection from './AnalysisSection';

interface Props {
  result: AnalysisResult;
}

const SECTIONS: {
  key: keyof AnalysisResult;
  iconName: string;
  headerClass: string;
  iconBubbleClass: string;
}[] = [
  {
    key: 'missingSkills',
    iconName: 'warning',
    headerClass: 'bg-error-container text-on-error-container border-b border-error-container',
    iconBubbleClass: 'bg-error/10 text-error',
  },
  {
    key: 'experienceGaps',
    iconName: 'work_history',
    headerClass: 'bg-tertiary-fixed text-on-tertiary-fixed border-b border-tertiary-fixed',
    iconBubbleClass: 'bg-tertiary/10 text-tertiary',
  },
  {
    key: 'keywordMismatches',
    iconName: 'sell',
    headerClass: 'bg-secondary-fixed text-on-secondary-fixed border-b border-secondary-fixed',
    iconBubbleClass: 'bg-secondary/10 text-secondary',
  },
  {
    key: 'actionPlan',
    iconName: 'bolt',
    headerClass: 'bg-primary-fixed text-on-primary-fixed border-b border-primary-fixed',
    iconBubbleClass: 'bg-primary/10 text-primary',
  },
];

export default function AnalysisResults({ result }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
        <p className="text-sm font-semibold text-on-surface-variant">Analysis complete</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {SECTIONS.map(({ key, iconName, headerClass, iconBubbleClass }) => (
          <AnalysisSection
            key={key}
            section={result[key]}
            iconName={iconName}
            headerClass={headerClass}
            iconBubbleClass={iconBubbleClass}
          />
        ))}
      </div>
    </div>
  );
}
