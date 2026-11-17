const COMPLETED_KEY = 'shooter_campaign_completed';

/**
 * Progresso mínimo da campanha (ids concluídos).
 */
const CampaignProgress = {
  load() {
    try {
      const raw = localStorage.getItem(COMPLETED_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch (_) {
      return [];
    }
  },

  isCompleted(id) {
    return this.load().includes(String(id));
  },

  markCompleted(id) {
    if (!id) return;
    const list = this.load();
    const sid = String(id);
    if (list.includes(sid)) return;
    list.push(sid);
    try {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
    } catch (_) {
      /* ignore */
    }
  },
};

export { CampaignProgress, COMPLETED_KEY };
