import { Component } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonNote, IonButtons } from '@ionic/angular/standalone';
import { HELP_GUIDES } from './help-guides';
import { HelpVisualGuideComponent } from './help-visual-guide.component';
import { ThemeToggleComponent } from '../components/theme-toggle.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonNote, IonButtons, HelpVisualGuideComponent, ThemeToggleComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>How to use</ion-title>
        <ion-buttons slot="end">
          <app-theme-toggle />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="false" class="help-ion-content app-safe-content">
      <div class="help-page">
        <p class="help-intro">
          Howzat - Counter helps you score a limited-overs innings ball by ball from the umpire’s view.
        </p>

        <section class="section-card section-card--guides">
          <h2 class="section-title">Visual guides</h2>
          <p class="help-text">Quick flows — scroll sideways on tab rows if needed.</p>
          @for (g of guides; track g.id) {
            <div class="guide-block">
              <h3 class="guide-title">{{ g.title }}</h3>
              @if (g.caption) {
                <p class="guide-caption">{{ g.caption }}</p>
              }
              <app-help-visual-guide [guide]="g" />
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
            <li><strong>WD</strong> — wide. Tap extra runs off the wide (0–6), <strong>W</strong> for a wicket on the same delivery (e.g. run out), or <strong>Done (+0)</strong> for wide only.</li>
            <li><strong>NB</strong> — no-ball. Same flow as wide.</li>
            <li><strong>Lb</strong> / <strong>Bye</strong> — leg-bye or bye (if enabled). Tap <strong>1–4</strong> for multiple runs, or <strong>Done (+1)</strong> for a single.</li>
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
            The <strong>History</strong> tab lists every over — <strong>most recent at the top</strong>. You’ll see the
            running score, extras, and run rate. Use <strong>Share scorecard</strong> to copy or share a full text summary
            (overs listed in bowling order).
          </p>
        </section>

        <section class="section-card">
          <h2 class="section-title">6. Undo, reset &amp; settings</h2>
          <ul class="help-list">
            <li><strong>Undo</strong> — remove the last logged ball (or cancel a pending wide/no-ball/wicket).</li>
            <li><strong>Redo</strong> — restore the last undone ball.</li>
            <li><strong>Reset</strong> — clear the match and return to the start screen (confirmation shown).</li>
            <li><strong>Settings</strong> — haptic feedback, wicket sound, four/six/wicket toasts, extra button visibility, and current match details while scoring.</li>
            <li><strong>Theme</strong> — tap the <strong>sun/moon</strong> icon (top right on every screen) to switch light and dark mode.</li>
          </ul>
        </section>

        <section class="section-card section-card--muted">
          <h2 class="section-title">Tips</h2>
          <ul class="help-list">
            <li>Match limits are fixed at setup; reset the match to change them. Extras visibility can be changed anytime in Settings.</li>
            <li>Four and six show a brief score flash; optional toast and sound on wicket (Settings → Feedback).</li>
            <li>When all overs are bowled, all wickets have fallen, or a chase target is reached, the keypad locks until you undo the last ball.</li>
            <li>On small screens, scroll the middle area if the over strip is long — the keypad stays fixed at the bottom.</li>
            <li>On iPhone/iPad, the app may offer an update when a new version is on the App Store.</li>
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
      padding: 16px;
    }

    .section-card--guides {
      padding-bottom: 12px;
    }

    .section-card--muted {
      background: var(--app-surface-muted, var(--ion-background-color));
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 10px;
      color: var(--ion-text-color);
    }

    .guide-block {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color, #e2e8f0);
    }

    .guide-block:first-of-type {
      margin-top: 10px;
      padding-top: 0;
      border-top: none;
    }

    .guide-title {
      font-size: 0.9rem;
      font-weight: 700;
      margin: 0 0 4px;
      color: var(--ion-color-primary-shade, #4854e0);
    }

    .guide-caption {
      margin: 0 0 10px;
      font-size: 0.78rem;
      line-height: 1.4;
      color: var(--ion-color-medium-shade, #5f6368);
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
export class HelpComponent {
  readonly guides = HELP_GUIDES;
}
