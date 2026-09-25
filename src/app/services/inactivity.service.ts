import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { fromEvent, merge, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private auth = inject(AuthService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private timer: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  constructor() {
    if (!this.isBrowser) return;

    this.sub = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'click'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
    ).subscribe(() => this.reset());

    this.reset();
  }

  private reset(): void {
    if (!this.auth.isLoggedIn()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.auth.logout(), INACTIVITY_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.sub?.unsubscribe();
  }
}
