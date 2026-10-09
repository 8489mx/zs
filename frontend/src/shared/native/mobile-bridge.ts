import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type MobilePlatform = 'android' | 'ios' | 'web';

class MobileBridge {
  private initialized = false;

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public getPlatform(): MobilePlatform {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
    return 'web';
  }

  public async initNativeApp(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.isNative()) {
      return;
    }

    try {
      // 1. Configure Native Status Bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#170e5e' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {
      // Ignore if unsupported on web/mock
    }

    try {
      // 2. Hide Splash Screen smoothly once React is ready
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {
      // Ignore
    }

    try {
      // 3. Register Native Android Hardware Back Button Listener
      App.addListener('backButton', ({ canGoBack }) => {
        // A) If a modal or dialog is open in DOM, dismiss it first
        const activeDialog = document.querySelector('.standard-dialog-container, [role="dialog"], .dialog-shell-root') as HTMLElement | null;
        if (activeDialog) {
          const closeBtn = activeDialog.querySelector('.standard-dialog-close-btn, [data-dialog-close], button[aria-label="close"], button[aria-label="إغلاق"]') as HTMLElement | null;
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }

        // B) If custom sheet or drawer is open
        const activeSheet = document.querySelector('.bottom-sheet-overlay, .mobile-quick-action-sheet') as HTMLElement | null;
        if (activeSheet) {
          const backdrop = activeSheet.querySelector('.bottom-sheet-backdrop') as HTMLElement | null;
          if (backdrop) {
            backdrop.click();
            return;
          }
        }

        // C) If router can go back
        if (canGoBack && window.location.pathname !== '/' && window.location.pathname !== '/mobile' && window.location.pathname !== '/owner-mobile') {
          window.history.back();
          return;
        }

        // D) Otherwise minimize / exit app cleanly
        App.minimizeApp();
      });
    } catch {
      // Ignore
    }
  }

  public async vibrate(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
    if (this.isNative()) {
      try {
        if (type === 'light') {
          await Haptics.impact({ style: ImpactStyle.Light });
        } else if (type === 'medium') {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } else if (type === 'heavy') {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } else if (type === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else if (type === 'warning') {
          await Haptics.notification({ type: NotificationType.Warning });
        } else if (type === 'error') {
          await Haptics.notification({ type: NotificationType.Error });
        }
        return;
      } catch {
        // Fallback
      }
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(15);
        else if (type === 'medium') navigator.vibrate(35);
        else if (type === 'heavy') navigator.vibrate(60);
        else if (type === 'success') navigator.vibrate([20, 50, 20]);
        else if (type === 'warning') navigator.vibrate([40, 40, 40]);
        else if (type === 'error') navigator.vibrate([60, 40, 60, 40]);
      } catch {
        // Ignore
      }
    }
  }

  public async isOnline(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const status = await Network.getStatus();
        return status.connected;
      } catch {
        // Fallback to navigator
      }
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public onNetworkStatusChange(callback: (connected: boolean) => void): () => void {
    if (this.isNative()) {
      const handlePromise = Network.addListener('networkStatusChange', (status) => {
        callback(status.connected);
      });

      return () => {
        handlePromise.then((handle) => handle.remove()).catch(() => {});
      };
    }

    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }
}

export const mobileBridge = new MobileBridge();
