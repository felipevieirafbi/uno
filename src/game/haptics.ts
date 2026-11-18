const VIBRATION_STORAGE_KEY = 'unozueira_vibration_enabled_v1';

class HapticsEngine {
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(VIBRATION_STORAGE_KEY);
        if (raw !== null) {
          this.enabled = raw === 'true';
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(VIBRATION_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
    }
    if (next) {
      this.pulse([18, 30, 26]);
    } else if (this.isSupported()) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public pulse(pattern: number | number[]): void {
    if (!this.enabled || !this.isSupported()) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported browser contexts
    }
  }

  public cardTap(isActionCard = false): void {
    this.pulse(isActionCard ? [24, 30, 38] : 14);
  }

  public drawTap(): void {
    this.pulse(12);
  }

  public sortRiffle(): void {
    this.pulse([10, 22, 10, 22, 14]);
  }

  public yourTurnNudge(): void {
    this.pulse([18, 40, 24]);
  }

  public unoShout(): void {
    this.pulse([32, 28, 60]);
  }

  public bombEscalation(pendingCount: number): void {
    const heavy = Math.min(95, 35 + pendingCount * 6);
    this.pulse([30, 25, heavy, 25, heavy]);
  }

  public penaltyAbsorbed(): void {
    this.pulse([65, 35, 90, 35, 110]);
  }

  public tauntSlam(rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'): void {
    if (rarity === 'legendary') {
      this.pulse([35, 25, 55, 25, 85, 30, 120]);
    } else if (rarity === 'epic') {
      this.pulse([30, 25, 65, 30, 80]);
    } else if (rarity === 'rare') {
      this.pulse([25, 30, 50]);
    } else {
      this.pulse([22, 28, 34]);
    }
  }

  public doubleStakesSlam(): void {
    this.pulse([55, 30, 95]);
  }

  public flipWave(): void {
    this.pulse([25, 20, 45, 20, 70]);
  }

  public comboBurst(): void {
    this.pulse([20, 20, 30, 20, 45]);
  }

  public victoryFanfare(): void {
    this.pulse([35, 35, 35, 35, 55, 40, 130]);
  }
}

export const haptics = new HapticsEngine();
