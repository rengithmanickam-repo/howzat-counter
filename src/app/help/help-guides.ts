export type HelpGuideLayout = 'pipeline' | 'row' | 'fork';

export type HelpGuideTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface HelpGuideStep {
  label: string;
  sublabel?: string;
  icon?: string;
  tone?: HelpGuideTone;
}

export interface HelpGuideBranch {
  label: string;
  steps: HelpGuideStep[];
}

export interface HelpGuide {
  id: string;
  title: string;
  caption?: string;
  layout: HelpGuideLayout;
  steps?: HelpGuideStep[];
  branches?: HelpGuideBranch[];
  mergeLabel?: string;
  mergeStep?: HelpGuideStep;
}

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'app-flow',
    title: 'App flow',
    caption: 'From opening the app to scoring and review.',
    layout: 'pipeline',
    steps: [
      { label: 'Start screen', sublabel: 'Tap Start', icon: 'play-outline', tone: 'primary' },
      { label: 'Match setup', sublabel: 'Overs, wickets, chase', icon: 'options-outline', tone: 'neutral' },
      { label: 'Live scoring', sublabel: 'Keypad + over strip', icon: 'keypad-outline', tone: 'primary' },
      { label: 'History / Help / Settings', sublabel: 'Bottom tabs anytime', icon: 'apps-outline', tone: 'neutral' },
      { label: 'Innings complete', sublabel: 'Max overs, wickets, or chase target', icon: 'lock-closed-outline', tone: 'warning' },
      { label: 'Undo to continue', sublabel: 'Or Reset to start fresh', icon: 'arrow-undo-outline', tone: 'success' }
    ]
  },
  {
    id: 'tabs',
    title: 'Bottom tabs',
    layout: 'row',
    steps: [
      { label: 'Home', sublabel: 'Score + keypad', icon: 'home-outline', tone: 'primary' },
      { label: 'History', sublabel: 'All overs', icon: 'list-outline', tone: 'neutral' },
      { label: 'Help', sublabel: 'This guide', icon: 'help-circle-outline', tone: 'neutral' },
      { label: 'Settings', sublabel: 'Feedback + extras', icon: 'settings-outline', tone: 'neutral' }
    ]
  },
  {
    id: 'theme',
    title: 'Theme',
    caption: 'Top-right on every screen.',
    layout: 'row',
    steps: [
      { label: 'Moon icon', sublabel: 'Tap for dark mode', icon: 'moon-outline', tone: 'neutral' },
      { label: 'Sun icon', sublabel: 'Tap for light mode', icon: 'sunny-outline', tone: 'warning' }
    ]
  },
  {
    id: 'wicket',
    title: 'Logging a wicket',
    caption: 'Tap W, then runs completed before dismissal if any.',
    layout: 'fork',
    steps: [
      { label: 'Tap W', icon: 'close-circle-outline', tone: 'danger' },
      { label: 'Wicket pending', sublabel: 'Banner appears', icon: 'alert-circle-outline', tone: 'warning' }
    ],
    branches: [
      {
        label: 'No runs before out',
        steps: [{ label: 'Done (+0)', icon: 'checkmark-circle-outline', tone: 'success' }]
      },
      {
        label: '1–6 runs before out',
        steps: [{ label: 'Tap run 1–6', icon: 'keypad-outline', tone: 'primary' }]
      }
    ],
    mergeStep: { label: 'Ball logged: W', icon: 'checkmark-done-outline', tone: 'success' }
  },
  {
    id: 'wide-nb',
    title: 'Wide or no-ball',
    caption: 'Same flow for WD and NB.',
    layout: 'fork',
    steps: [
      { label: 'Tap WD or NB', icon: 'expand-outline', tone: 'warning' },
      { label: 'Extra pending', icon: 'alert-circle-outline', tone: 'warning' }
    ],
    branches: [
      {
        label: 'Runs off delivery',
        steps: [{ label: 'Tap 0–6', icon: 'keypad-outline', tone: 'primary' }]
      },
      {
        label: 'Wicket on delivery',
        steps: [{ label: 'Tap W', icon: 'close-circle-outline', tone: 'danger' }]
      },
      {
        label: 'Extra only',
        steps: [{ label: 'Done (+0)', icon: 'checkmark-circle-outline', tone: 'success' }]
      }
    ],
    mergeStep: { label: 'Ball logged', icon: 'checkmark-done-outline', tone: 'success' }
  },
  {
    id: 'lb-bye',
    title: 'Leg-bye or bye',
    caption: 'Legal deliveries; Done defaults to one run.',
    layout: 'fork',
    steps: [
      { label: 'Tap Lb or Bye', icon: 'return-down-forward-outline', tone: 'primary' },
      { label: 'Extra pending', icon: 'alert-circle-outline', tone: 'warning' }
    ],
    branches: [
      {
        label: 'Multiple runs',
        steps: [{ label: 'Tap 1–4', icon: 'keypad-outline', tone: 'primary' }]
      },
      {
        label: 'Single',
        steps: [{ label: 'Done (+1)', icon: 'checkmark-circle-outline', tone: 'success' }]
      }
    ],
    mergeStep: { label: 'Ball logged', icon: 'checkmark-done-outline', tone: 'success' }
  },
  {
    id: 'over',
    title: 'Between overs',
    layout: 'pipeline',
    steps: [
      { label: 'Last legal ball', sublabel: 'Of the current over', icon: 'flag-outline', tone: 'success' },
      { label: 'Over stays visible', sublabel: 'Complete pill shown', icon: 'eye-outline', tone: 'neutral' },
      { label: 'Green hint', sublabel: 'Log next over’s 1st ball', icon: 'chatbubble-ellipses-outline', tone: 'success' },
      { label: 'New over strip', sublabel: 'Scoring continues', icon: 'arrow-forward-circle-outline', tone: 'primary' }
    ]
  },
  {
    id: 'chase',
    title: 'Batting second chase',
    layout: 'fork',
    steps: [
      { label: 'Chasing a target ON', sublabel: 'In match setup', icon: 'trophy-outline', tone: 'warning' },
      { label: 'Need X to win + RRR', sublabel: 'Shown on scorecard', icon: 'speedometer-outline', tone: 'primary' }
    ],
    branches: [
      {
        label: 'Still chasing',
        steps: [{ label: 'Keep scoring', icon: 'keypad-outline', tone: 'primary' }]
      },
      {
        label: 'Target reached',
        steps: [{ label: 'Keypad locked', icon: 'lock-closed-outline', tone: 'warning' }]
      }
    ],
    mergeStep: { label: 'Undo last ball to continue', icon: 'arrow-undo-outline', tone: 'success' }
  }
];
