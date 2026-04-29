const Store = {
  keys: {
    pocket: "dg_pocket_v2",
    scores: "dg_scores_v2",
    missions: "dg_missions_v2",
    episodes: "dg_episodes_v2",
    stats: "dg_stats_v2"
  },

  read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },

  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  pocket() {
    return this.read(this.keys.pocket, []);
  },

  savePocket(items) {
    this.write(this.keys.pocket, items);
  },

  episodes() {
    const existing = this.read(this.keys.episodes, null);
    if (existing) return existing;
    this.write(this.keys.episodes, Seed.episodes);
    return Seed.episodes;
  },

  saveEpisodes(items) {
    this.write(this.keys.episodes, items);
  },

  missions() {
    const existing = this.read(this.keys.missions, null);
    if (existing) return existing;
    this.write(this.keys.missions, Seed.missions);
    return Seed.missions;
  },

  saveMissions(items) {
    this.write(this.keys.missions, items);
  },

  scores() {
    return this.read(this.keys.scores, []);
  },

  saveScore(score, comics) {
    const scores = this.scores();
    scores.push({
      id: Date.now(),
      score,
      comics,
      date: new Date().toLocaleString()
    });
    scores.sort((a, b) => b.score - a.score);
    this.write(this.keys.scores, scores.slice(0, 10));
  },

  stats() {
    return this.read(this.keys.stats, {
      comics: 0,
      gadgets: 0,
      uses: 0,
      score: 0
    });
  },

  setStats(stats) {
    this.write(this.keys.stats, stats);
  },

  addStats(delta) {
    const stats = this.stats();
    Object.keys(delta).forEach(key => {
      stats[key] = Math.max(0, (stats[key] || 0) + delta[key]);
    });
    this.setStats(stats);
    this.updateMissionProgress();
  },

  updateMissionProgress() {
    const stats = this.stats();
    const missions = this.missions().map(m => {
      const value = stats[m.type] || 0;
      return {
        ...m,
        progress: Math.min(value, m.target),
        completed: value >= m.target
      };
    });
    this.saveMissions(missions);
  }
};

const Seed = {
  episodes: [
    {
      id: 1,
      title: "The Anywhere Door Adventure",
      category: "Adventure",
      gadget: "Anywhere Door",
      rating: 5,
      description: "Nobita uses the Anywhere Door and accidentally jumps between different places."
    },
    {
      id: 2,
      title: "Bamboo Copter Race",
      category: "Comedy",
      gadget: "Bamboo Copter",
      rating: 4,
      description: "A flying race starts after Doraemon gives everyone bamboo copters."
    },
    {
      id: 3,
      title: "Time Machine Trouble",
      category: "Adventure",
      gadget: "Time Machine",
      rating: 5,
      description: "Nobita travels through time and creates a confusing timeline."
    },
    {
      id: 4,
      title: "Memory Bread Exam Day",
      category: "Classic",
      gadget: "Memory Bread",
      rating: 4,
      description: "Nobita tries to prepare for an exam with Memory Bread."
    },
    {
      id: 5,
      title: "Small Light Mystery",
      category: "Gadget Focus",
      gadget: "Small Light",
      rating: 4,
      description: "Everyday objects become tiny after Nobita uses Small Light."
    },
    {
      id: 6,
      title: "Big Light Problem",
      category: "Comedy",
      gadget: "Big Light",
      rating: 3,
      description: "A small issue becomes huge after Big Light is used carelessly."
    }
  ],

  missions: [
    { id: 1, title: "Collect 5 comic books", type: "comics", target: 5, progress: 0, completed: false },
    { id: 2, title: "Collect 3 gadgets", type: "gadgets", target: 3, progress: 0, completed: false },
    { id: 3, title: "Use gadgets 2 times", type: "uses", target: 2, progress: 0, completed: false },
    { id: 4, title: "Reach 500 score", type: "score", target: 500, progress: 0, completed: false }
  ]
};
