import {
  controlMode,
  setControlMode,
  CONTROLSMODES,
} from '../core/input.js';

const STORAGE_KEY = 'shooter_settings';

/**
 * Modal HTML de configurações — controle + volume/mudo.
 */
const SettingsSystem = {
  isOpen: false,
  volume: 70,
  muted: false,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.volume != null) this.volume = Math.max(0, Math.min(100, Number(data.volume)));
      if (data.muted != null) this.muted = !!data.muted;
      if (data.controlMode === CONTROLSMODES.HELICOPTER || data.controlMode === CONTROLSMODES.PLANE) {
        setControlMode(data.controlMode);
      }
    } catch (e) {
      /* ignore */
    }
  },

  save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        controlMode,
        volume: this.volume,
        muted: this.muted,
      })
    );
  },

  /** Volume efetivo 0–1 para futuro áudio. */
  getEffectiveVolume() {
    return this.muted ? 0 : this.volume / 100;
  },

  syncUI() {
    const planeBtn = document.getElementById('settingsControlPlane');
    const heliBtn = document.getElementById('settingsControlHeli');
    const vol = document.getElementById('settingsVolume');
    const volLabel = document.getElementById('settingsVolumeValue');
    const mute = document.getElementById('settingsMute');

    if (planeBtn && heliBtn) {
      planeBtn.classList.toggle('active', controlMode === CONTROLSMODES.PLANE);
      heliBtn.classList.toggle('active', controlMode === CONTROLSMODES.HELICOPTER);
    }
    if (vol) vol.value = String(this.volume);
    if (volLabel) volLabel.textContent = `${this.volume}%`;
    if (mute) mute.checked = this.muted;
  },

  open() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    this.isOpen = true;
    this.syncUI();
    modal.classList.add('active');
  },

  close() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    this.isOpen = false;
    this.save();
    modal.classList.remove('active');
  },

  init() {
    this.load();

    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettings');
    const planeBtn = document.getElementById('settingsControlPlane');
    const heliBtn = document.getElementById('settingsControlHeli');
    const vol = document.getElementById('settingsVolume');
    const mute = document.getElementById('settingsMute');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });
    }

    if (planeBtn) {
      planeBtn.addEventListener('click', () => {
        setControlMode(CONTROLSMODES.PLANE);
        this.syncUI();
        this.save();
      });
    }
    if (heliBtn) {
      heliBtn.addEventListener('click', () => {
        setControlMode(CONTROLSMODES.HELICOPTER);
        this.syncUI();
        this.save();
      });
    }

    if (vol) {
      vol.addEventListener('input', () => {
        this.volume = Number(vol.value);
        this.syncUI();
        this.save();
      });
    }

    if (mute) {
      mute.addEventListener('change', () => {
        this.muted = mute.checked;
        this.syncUI();
        this.save();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen) this.close();
    });

    this.syncUI();
  },
};

export { SettingsSystem };
