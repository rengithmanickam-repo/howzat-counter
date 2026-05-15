export interface HelpDiagram {
  id: string;
  title: string;
  caption?: string;
  source: string;
}

export const HELP_DIAGRAMS: HelpDiagram[] = [
  {
    id: 'app-flow',
    title: 'App flow',
    caption: 'From opening the app to scoring and review.',
    source: `flowchart TD
      Start([Start screen]) --> Setup[Match setup]
      Setup --> Score[Live scoring]
      Score --> Hist[History tab]
      Score --> Help[Help tab]
      Score --> Set[Settings tab]
      Score -->|Reset| Start
      Score --> End{Innings over?}
      End -->|Max overs| Lock[Keypad locked]
      End -->|Max wickets| Lock
      End -->|Chase target reached| Lock
      Lock -->|Undo below target| Score`
  },
  {
    id: 'tabs',
    title: 'Bottom tabs',
    source: `flowchart LR
      H[Home\nscore + keypad]
      Hi[History\nall overs]
      He[Help\nthis guide]
      S[Settings\nhaptics + extras]
      H --- Hi --- He --- S`
  },
  {
    id: 'wicket',
    title: 'Logging a wicket',
    caption: 'Tap W, then runs completed before dismissal if any.',
    source: `flowchart TD
      W[Tap W] --> Pending[Wicket pending banner]
      Pending --> R{Runs before out?}
      R -->|0 runs| D0[Tap Done +0]
      R -->|1 to 6| Rn[Tap run 1-6]
      D0 --> Log[Ball logged: W]
      Rn --> Log`
  },
  {
    id: 'wide-nb',
    title: 'Wide or no-ball',
    caption: 'Same flow for WD and NB.',
    source: `flowchart TD
      X[Tap WD or NB] --> P[Extra pending]
      P --> Runs[Tap 0-6 for runs off delivery]
      Runs --> Done[Tap Done or auto-complete]
      P --> Wk{Wicket on delivery?}
      Wk -->|Yes| W[Tap W]
      Wk -->|No| Done
      W --> Log[Ball logged]
      Done --> Log`
  },
  {
    id: 'over',
    title: 'Between overs',
    source: `flowchart LR
      B6[6th legal ball logged] --> Show[Completed over stays on screen]
      Show --> Hint[Over complete hint]
      Hint --> B1[Log 1st ball of next over]
      B1 --> New[New over strip appears]`
  },
  {
    id: 'chase',
    title: 'Batting second chase',
    source: `flowchart TD
      Setup[Chasing a target ON in setup] --> Live[Need X to win + RRR shown]
      Live --> Hit{Score >= target?}
      Hit -->|No| Live
      Hit -->|Yes| Lock[Target reached — scoring locked]
      Lock --> Undo[Undo last ball to continue]`
  }
];
