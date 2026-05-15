import {
  Component,
  ElementRef,
  afterNextRender,
  viewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonNote } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { HELP_DIAGRAMS } from './help-diagrams';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonNote],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>How to use</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="false" class="help-ion-content app-safe-content">
      <div class="help-page">
        <p class="help-intro">
          Howzat Counter helps you score a limited-overs innings ball by ball from the umpire’s view.
        </p>

        <section class="section-card section-card--diagrams">
          <h2 class="section-title">Visual guides</h2>
          <p class="help-text">Scroll sideways on wide diagrams if needed.</p>
          @for (d of diagrams; track d.id) {
            <div class="diagram-block">
              <h3 class="diagram-title">{{ d.title }}</h3>
              @if (d.caption) {
                <p class="diagram-caption">{{ d.caption }}</p>
              }
              <div
                #diagramHost
                class="diagram-host"
                [attr.data-diagram-id]="d.id"
                [attr.aria-label]="d.title + ' diagram'"
                role="img"
              ></div>
            </div>
          }
        </section>

        <section class="section-card">
          <h2 class="section-title">1. Start a match</h2>
          <ol class="help-list">
            <li>Tap <strong>Start</strong> on the home screen.</li>
            <li>On <strong>Match Setup</strong>, set overs, balls per over, and max wickets.</li>
            <li>Optionally enter a <strong>batting side</strong> name (shown on the score).</li>
            <li>Turn on <strong>Chasing a target</strong> if batting second and enter runs to win (e.g. 152).</li>
            <li>Choose which extra buttons appear on the keypad, then tap <strong>Start Match</strong>.</li>
          </ol>
          <ion-note class="section-hint">
            Tapping Start clears batting side and chase fields so each new match begins fresh.
          </ion-note>
        </section>

        <section class="section-card">
          <h2 class="section-title">2. Scoring keypad</h2>
          <ul class="help-list">
            <li><strong>0–6</strong> — runs off the bat on a legal delivery.</li>
            <li><strong>W</strong> — wicket. If runs were completed before dismissal (e.g. run out), tap runs then confirm; otherwise use <strong>Done (+0)</strong>.</li>
            <li><strong>WD</strong> — wide. Tap extra runs off the wide (0–6), or <strong>Done (+0)</strong> for wide only.</li>
            <li><strong>NB</strong> — no-ball. Same flow as wide.</li>
            <li><strong>Lb</strong> / <strong>Bye</strong> — leg-bye or bye (if enabled in setup).</li>
          </ul>
          <ion-note class="section-hint">
            Extras line shows delivery counts, e.g. Extras: 2 (1WD,1NB). RR is current run rate when an over limit is set.
          </ion-note>
        </section>

        <section class="section-card">
          <h2 class="section-title">3. Over strip</h2>
          <p class="help-text">
            The current over shows each delivery (e.g. 3.4) and the score in that box. After the last legal ball of an over,
            the completed over stays visible until you log the first ball of the next over.
          </p>
        </section>

        <section class="section-card">
          <h2 class="section-title">4. Batting second (chase)</h2>
          <p class="help-text">
            With a chase target set, you’ll see runs needed, balls left, and <strong>RRR</strong> (required run rate).
            When the score reaches the target, scoring locks — like when all overs are bowled.
          </p>
        </section>

        <section class="section-card">
          <h2 class="section-title">5. History &amp; share</h2>
          <p class="help-text">
            The <strong>History</strong> tab lists every over. Use <strong>Share scorecard</strong> to copy or share a text summary.
          </p>
        </section>

        <section class="section-card">
          <h2 class="section-title">6. Undo, reset &amp; settings</h2>
          <ul class="help-list">
            <li><strong>Undo</strong> — remove the last logged ball (or cancel a pending wide/no-ball/wicket).</li>
            <li><strong>Redo</strong> — restore the last undone ball.</li>
            <li><strong>Reset</strong> (↻) — clear the match and return to the start screen.</li>
            <li><strong>Settings</strong> — haptic feedback, wicket sound, and extra button visibility during a match.</li>
          </ul>
        </section>

        <section class="section-card section-card--muted">
          <h2 class="section-title">Tips</h2>
          <ul class="help-list">
            <li>Match limits are fixed at setup; reset the match to change them.</li>
            <li>Four and six show a brief flash and toast; wickets can play a sound (enable in Settings).</li>
            <li>On small screens, scroll the middle area if the over strip is long — the keypad stays fixed at the bottom.</li>
          </ul>
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .help-ion-content {
      --background: var(--ion-background-color, #f4f5f8);
    }

    .help-page {
      padding: 16px 14px calc(20px + var(--app-safe-bottom, env(safe-area-inset-bottom, 12px)));
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .help-intro {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.45;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .section-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      padding: 16px;
    }

    .section-card--diagrams {
      padding-bottom: 12px;
    }

    .section-card--muted {
      background: var(--ion-background-color, #f4f5f8);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 10px;
      color: var(--ion-text-color);
    }

    .diagram-block {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color, #e2e8f0);
    }

    .diagram-block:first-of-type {
      margin-top: 10px;
      padding-top: 0;
      border-top: none;
    }

    .diagram-title {
      font-size: 0.9rem;
      font-weight: 700;
      margin: 0 0 4px;
      color: var(--ion-color-primary-shade, #4854e0);
    }

    .diagram-caption {
      margin: 0 0 8px;
      font-size: 0.78rem;
      line-height: 1.4;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .diagram-host {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 8px;
      background: #f8fafc;
      padding: 8px 4px;
      min-height: 48px;
    }

    .diagram-host ::ng-deep svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }

    .diagram-fallback {
      margin: 0;
      padding: 8px;
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade, #5f6368);
      text-align: center;
    }

    .help-text {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--ion-text-color);
    }

    .help-list {
      margin: 0;
      padding-left: 1.15rem;
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--ion-text-color);
    }

    .help-list li + li {
      margin-top: 6px;
    }

    .section-hint {
      display: block;
      margin-top: 10px;
      font-size: 0.8rem;
      line-height: 1.45;
      color: var(--ion-color-medium-shade, #5f6368);
    }
  `]
})
export class HelpComponent implements ViewWillEnter {
  readonly diagrams = HELP_DIAGRAMS;

  private readonly diagramHosts = viewChildren<ElementRef<HTMLElement>>('diagramHost');
  private mermaidReady = false;
  private renderGen = 0;

  constructor() {
    afterNextRender(() => void this.renderDiagrams());
  }

  ionViewWillEnter(): void {
    void this.renderDiagrams();
  }

  private async renderDiagrams(): Promise<void> {
    const hosts = this.diagramHosts();
    if (hosts.length === 0) return;

    const gen = ++this.renderGen;

    try {
      const mermaid = (await import('mermaid')).default;
      if (!this.mermaidReady) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'strict',
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
        });
        this.mermaidReady = true;
      }

      for (const hostRef of hosts) {
        if (gen !== this.renderGen) return;

        const el = hostRef.nativeElement;
        const id = el.dataset['diagramId'];
        const def = HELP_DIAGRAMS.find(d => d.id === id);
        if (!def) continue;

        el.innerHTML = '';
        const renderId = `help-mmd-${def.id}-${gen}`;
        const { svg } = await mermaid.render(renderId, def.source);
        if (gen !== this.renderGen) return;
        el.innerHTML = svg;
      }
    } catch {
      for (const hostRef of hosts) {
        hostRef.nativeElement.innerHTML =
          '<p class="diagram-fallback">Diagram could not be loaded. See the text sections below.</p>';
      }
    }
  }
}
