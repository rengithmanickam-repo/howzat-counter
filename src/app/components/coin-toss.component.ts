import { Component, computed, inject, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { HapticService } from '../services/haptic.service';

type TossResult = 'heads' | 'tails';

interface Edge {
  transform: string;
  height: number;
}

@Component({
  selector: 'app-coin-toss',
  standalone: true,
  imports: [IonButton],
  template: `
    <div class="toss-wrap">
      <div class="coin-stage">
        <div class="coin-shadow" [class.is-tossing]="flipping()"></div>
        <div class="coin-lift" [class.is-tossing]="flipping()">
          <div class="coin" [style.transform]="'rotateX(' + rotation() + 'deg)'">
            <!-- Heads: Washington profile -->
            <div class="coin-face coin-quarter">
              <svg class="coin-art" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <path id="hTop" d="M14,50 A36,36 0 0 1 86,50" />
                  <path id="hBot" d="M16,52 A34,34 0 0 0 84,52" />
                </defs>
                <g class="relief">
                  <path d="M60,26 C49,23 40,30 38,41 C37,45 33,46 32,49
                           C30,51 31,53 34,54 C35,56 33,58 36,59
                           C37,61 40,62 42,64 C45,67 48,69 53,71
                           L60,75 C68,72 71,63 71,51
                           C71,37 67,28 60,26 Z" />
                </g>
                <text class="legend"><textPath href="#hTop" startOffset="50%">LIBERTY</textPath></text>
                <text class="legend small"><textPath href="#hBot" startOffset="50%">IN GOD WE TRUST</textPath></text>
              </svg>
            </div>
            <!-- Tails: Eagle -->
            <div class="coin-face coin-quarter coin-tails">
              <svg class="coin-art" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <path id="tTop" d="M13,50 A37,37 0 0 1 87,50" />
                  <path id="tBot" d="M16,52 A34,34 0 0 0 84,52" />
                </defs>
                <g class="relief">
                  <circle cx="50" cy="37" r="4" />
                  <path d="M50,40 C46,40 44,44 44,49 C44,55 47,61 50,65
                           C53,61 56,55 56,49 C56,44 54,40 50,40 Z" />
                  <path d="M45,47 C35,40 25,42 17,51 C26,51 35,53 45,53 Z" />
                  <path d="M55,47 C65,40 75,42 83,51 C74,51 65,53 55,53 Z" />
                  <path d="M44,55 C40,60 36,62 31,63 C37,65 43,64 47,60 Z" />
                  <path d="M56,55 C60,60 64,62 69,63 C63,65 57,64 53,60 Z" />
                </g>
                <text class="legend small"><textPath href="#tTop" startOffset="50%">UNITED STATES OF AMERICA</textPath></text>
                <text class="legend"><textPath href="#tBot" startOffset="50%">QUARTER DOLLAR</textPath></text>
              </svg>
            </div>
            <!-- Rim -->
            @for (e of edges; track $index) {
              <div class="coin-edge" [style.transform]="e.transform" [style.height.px]="e.height"></div>
            }
          </div>
        </div>
      </div>

      <p class="toss-result" [class.is-placeholder]="!result() && !flipping()">
        @if (flipping()) {
          Flipping…
        } @else if (result()) {
          {{ result() === 'heads' ? 'Heads' : 'Tails' }}
        } @else {
          Tap to flip the coin
        }
      </p>

      <ion-button
        expand="block"
        fill="outline"
        class="toss-btn"
        [disabled]="flipping()"
        (click)="flip()"
      >
        {{ result() ? 'Flip again' : 'Flip coin' }}
      </ion-button>
    </div>
  `,
  styles: [`
    .toss-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .coin-stage {
      perspective: 800px;
      perspective-origin: 50% 40%;
      height: 150px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 6px;
    }

    /* Floor shadow */
    .coin-shadow {
      width: 84px;
      height: 16px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 70%);
      transform: scale(1);
      margin-bottom: -4px;
      order: 2;
    }
    .coin-shadow.is-tossing {
      animation: tossShadow 1.35s cubic-bezier(0.33, 0, 0.3, 1) both;
    }

    .coin-lift {
      order: 1;
      transform: translateY(0);
    }
    .coin-lift.is-tossing {
      animation: tossLift 1.35s cubic-bezier(0.33, 0, 0.3, 1) both;
    }

    .coin {
      position: relative;
      width: 92px;
      height: 92px;
      transform-style: preserve-3d;
      transition: transform 1.35s cubic-bezier(0.2, 0.75, 0.2, 1);
      will-change: transform;
    }

    .coin-face {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 92px;
      height: 92px;
      margin: -46px 0 0 -46px;
      border-radius: 50%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Silver cupronickel quarter */
    .coin-quarter {
      transform: translateZ(7px);
      background:
        radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 40%),
        radial-gradient(circle at 50% 50%, #f2f4f7 0%, #d2d7df 42%, #aab1bd 76%, #8990a0 100%);
      box-shadow:
        inset 0 0 0 3px rgba(255,255,255,0.5),
        inset 0 0 0 5px rgba(120,128,140,0.4),
        inset 0 -8px 16px rgba(90,96,108,0.4),
        inset 0 8px 14px rgba(255,255,255,0.6);
    }

    .coin-tails {
      transform: rotateX(180deg) translateZ(7px);
    }

    .coin-art {
      width: 100%;
      height: 100%;
    }

    .relief {
      fill: rgba(54, 58, 66, 0.62);
      filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55));
    }

    .legend {
      fill: rgba(54, 58, 66, 0.7);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-anchor: middle;
      font-family: var(--ion-font-family, system-ui, sans-serif);
    }
    .legend.small {
      font-size: 6.2px;
      letter-spacing: 0.04em;
    }

    /* Milled silver rim */
    .coin-edge {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      background: linear-gradient(90deg, #6f7783 0%, #b9c0ca 25%, #f3f5f8 50%, #b9c0ca 75%, #6f7783 100%);
    }

    .toss-result {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--ion-text-color);
      min-height: 1.4em;
    }
    .toss-result.is-placeholder {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--ion-color-medium-shade, #5f6368);
    }

    .toss-btn {
      width: 100%;
      max-width: 220px;
      --border-radius: 12px;
      font-weight: 600;
    }

    @keyframes tossLift {
      0%   { transform: translateY(0) scale(1); }
      45%  { transform: translateY(-56px) scale(1.06); }
      100% { transform: translateY(0) scale(1); }
    }

    @keyframes tossShadow {
      0%   { transform: scale(1); opacity: 0.85; }
      45%  { transform: scale(0.6); opacity: 0.35; }
      100% { transform: scale(1); opacity: 0.85; }
    }

    @media (prefers-reduced-motion: reduce) {
      .coin { transition: transform 0.4s ease; }
      .coin-lift.is-tossing,
      .coin-shadow.is-tossing { animation: none; }
    }
  `]
})
export class CoinTossComponent {
  private readonly haptics = inject(HapticService);

  private static readonly SEGMENTS = 64;
  private static readonly RADIUS = 45;
  private static readonly DURATION_MS = 1350;

  readonly rotation = signal(0);
  readonly flipping = signal(false);
  readonly result = signal<TossResult | null>(null);

  readonly hasResult = computed(() => this.result() !== null);

  readonly edges: Edge[] = this.buildEdges();

  private buildEdges(): Edge[] {
    const { SEGMENTS, RADIUS } = CoinTossComponent;
    const step = 360 / SEGMENTS;
    const segHeight = (2 * Math.PI * RADIUS) / SEGMENTS + 1.2;
    const edges: Edge[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = i * step;
      edges.push({
        transform: `translate(-50%, -50%) rotateZ(${angle}deg) translateX(${RADIUS}px) rotateY(90deg)`,
        height: segHeight
      });
    }
    return edges;
  }

  flip(): void {
    if (this.flipping()) return;
    this.flipping.set(true);
    void this.haptics.lightTap();

    const outcome: TossResult = Math.random() < 0.5 ? 'heads' : 'tails';

    const current = this.rotation();
    const spins = 6 + Math.floor(Math.random() * 3);
    let target = Math.ceil(current / 360) * 360 + spins * 360;
    if (outcome === 'tails') target += 180;
    if (target <= current) target += 360;

    this.rotation.set(target);

    window.setTimeout(() => {
      this.result.set(outcome);
      this.flipping.set(false);
      void this.haptics.mediumTap();
    }, CoinTossComponent.DURATION_MS);
  }
}
