/**
 * Prompt de tela cheia no mobile + lock landscape quando suportado.
 * Nota: iOS Safari não oferece Fullscreen API nem orientation.lock de forma confiável.
 */
const FullscreenPrompt = {
  dismissed: false,
  el: null,

  isTouchDevice() {
    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  },

  isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  },

  canRequestFullscreen() {
    const root = document.documentElement;
    return !!(root.requestFullscreen || root.webkitRequestFullscreen);
  },

  shouldShow() {
    if (this.dismissed) return false;
    if (!this.isTouchDevice()) return false;
    if (this.isFullscreen()) return false;
    if (!this.canRequestFullscreen()) return false;
    return true;
  },

  async lockLandscape() {
    const orient = screen.orientation;
    if (!orient?.lock) return false;
    try {
      await orient.lock('landscape');
      return true;
    } catch (e) {
      /* tenta variantes */
    }
    try {
      await orient.lock('landscape-primary');
      return true;
    } catch (e) {
      /* Android sem permissão / iOS */
    }
    return false;
  },

  async request() {
    const root = document.documentElement;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch (e) {
      /* user gesture / policy */
    }

    // Lock costuma exigir fullscreen ativo — tenta agora e de novo no evento
    await this.lockLandscape();
    this.hide();
  },

  show() {
    if (!this.shouldShow()) {
      this.hide();
      return;
    }
    if (!this.el) {
      this.el = document.getElementById('fullscreenPrompt');
    }
    if (!this.el) return;
    this.el.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
  },

  hide() {
    if (!this.el) {
      this.el = document.getElementById('fullscreenPrompt');
    }
    if (!this.el) return;
    this.el.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
  },

  dismiss() {
    this.dismissed = true;
    this.hide();
  },

  init() {
    this.el = document.getElementById('fullscreenPrompt');
    if (!this.el) return;

    const goBtn = document.getElementById('fullscreenPromptGo');
    const skipBtn = document.getElementById('fullscreenPromptSkip');

    if (goBtn) {
      goBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.request();
      });
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
      });
    }

    document.addEventListener('fullscreenchange', () => {
      if (this.isFullscreen()) {
        this.hide();
        // Orientation lock só fica estável depois do fullscreen
        this.lockLandscape();
      } else if (!this.dismissed && window.MenuSystem?.active) {
        this.show();
      }
    });

    if (window.MenuSystem?.active) this.show();
  },
};

export { FullscreenPrompt };
