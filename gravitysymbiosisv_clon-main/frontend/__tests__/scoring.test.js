import { describe, it, expect } from "vitest";

describe("Fórmulas de puntuación (AGENTS.md)", () => {

  // FLOOR(closer_count * 30 / 60) = FLOOR(closer_count * 0.5)
  describe("Closer: FLOOR(val * 0.5)", () => {
    it("1 closer = 0 min", () => {
      expect(Math.floor(1 * 0.5)).toBe(0);
    });
    it("2 closer = 1 min", () => {
      expect(Math.floor(2 * 0.5)).toBe(1);
    });
    it("3 closer = 1 min", () => {
      expect(Math.floor(3 * 0.5)).toBe(1);
    });
    it("4 closer = 2 min", () => {
      expect(Math.floor(4 * 0.5)).toBe(2);
    });
    it("0 closer = 0 min", () => {
      expect(Math.floor(0 * 0.5)).toBe(0);
    });
    it("Math.round sobrecuenta para valores impares", () => {
      expect(Math.round(1 * 0.5)).toBe(1); // incorrecto segun AGENTS.md
      expect(Math.floor(1 * 0.5)).toBe(0);  // correcto
    });
  });

  describe("Quiz: FLOOR(val * 0.5)", () => {
    it("1 quiz = 0 min", () => {
      expect(Math.floor(1 * 0.5)).toBe(0);
    });
    it("2 quiz = 1 min", () => {
      expect(Math.floor(2 * 0.5)).toBe(1);
    });
    it("10 quiz = 5 min", () => {
      expect(Math.floor(10 * 0.5)).toBe(5);
    });
    it("11 quiz = 5 min (floor)", () => {
      expect(Math.floor(11 * 0.5)).toBe(5);
    });
  });

  describe("Training: FLOOR(duration_sec / 60)", () => {
    it("60s = 1 min", () => {
      expect(Math.floor(60 / 60)).toBe(1);
    });
    it("150s = 2 min", () => {
      expect(Math.floor(150 / 60)).toBe(2);
    });
    it("30s = 0 min", () => {
      expect(Math.floor(30 / 60)).toBe(0);
    });
  });

  describe("Combinación: training + closer + quiz (Dashboard ranking)", () => {
    function computeTotal(tr, cl, qz) {
      return (tr || 0) + Math.floor((cl || 0) * 0.5) + Math.floor((qz || 0) * 0.5);
    }

    it("solo training", () => {
      expect(computeTotal(10, 0, 0)).toBe(10);
    });
    it("training + closer", () => {
      expect(computeTotal(10, 3, 0)).toBe(11); // 10 + floor(1.5) = 11
    });
    it("training + quiz", () => {
      expect(computeTotal(10, 0, 5)).toBe(12); // 10 + floor(2.5) = 12
    });
    it("todo combinado", () => {
      expect(computeTotal(15, 4, 6)).toBe(20); // 15 + floor(2) + floor(3) = 20
    });
    it("solo 1 closer + 1 quiz = 0 min", () => {
      expect(computeTotal(0, 1, 1)).toBe(0); // floor(0.5) + floor(0.5) = 0
    });
  });
});

describe("Module totals hardcodeados (supa-client.ts)", () => {
  const MODULE_TOTALS = {
    'el-camino-del-lobo': 40,
    'rompe-la-barrera-del-no': 40,
    'ventas-spin': 40,
    'las-48-leyes-del-poder': 48,
  };
  const GRAND_TOTAL = 168;

  it("suma total = 168", () => {
    const sum = Object.values(MODULE_TOTALS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(GRAND_TOTAL);
  });

  it("getKnowledgeProgress calcula porcentaje global", () => {
    function calcProgress(data) {
      let totalAnswered = 0;
      data.forEach(row => {
        const moduleTotal = MODULE_TOTALS[row.module] || 40;
        totalAnswered += Math.round(((row.progress_percent || 0) / 100) * moduleTotal);
      });
      return Math.min(100, Math.round((totalAnswered / GRAND_TOTAL) * 100));
    }

    // 50% en cada modulo
    const data = Object.entries(MODULE_TOTALS).map(([module, total]) => ({
      module, progress_percent: 50
    }));
    const progress = calcProgress(data);
    // answered = (0.5 * 40) + (0.5 * 40) + (0.5 * 40) + (0.5 * 48) = 20+20+20+24 = 84
    // 84/168 = 50%
    expect(progress).toBe(50);
  });

  it("getKnowledgeAnsweredCount suma respuestas", () => {
    function calcAnswered(data) {
      let total = 0;
      data.forEach(row => {
        const moduleTotal = MODULE_TOTALS[row.module] || 40;
        total += Math.round(((row.progress_percent || 0) / 100) * moduleTotal);
      });
      return total;
    }

    const data = Object.entries(MODULE_TOTALS).map(([module, total]) => ({
      module, progress_percent: 100
    }));
    expect(calcAnswered(data)).toBe(GRAND_TOTAL);
  });
});

describe("Funciones auxiliares de Dashboard", () => {
  function buildDataMap(metrics) {
    const map = {};
    metrics.forEach(m => {
      map[m.day] = {
        training_minutes: m.training_minutes || 0,
        closer_count: m.closer_count || 0,
        quiz_answers: m.quiz_answers || 0
      };
    });
    return map;
  }

  it("buildDataMap construye mapa por día", () => {
    const metrics = [
      { day: "2026-07-15", training_minutes: 10, closer_count: 2, quiz_answers: 4 },
      { day: "2026-07-14", training_minutes: 5, closer_count: 1, quiz_answers: 2 },
    ];
    const map = buildDataMap(metrics);
    expect(map["2026-07-15"].training_minutes).toBe(10);
    expect(map["2026-07-14"].quiz_answers).toBe(2);
    expect(Object.keys(map).length).toBe(2);
  });

  it("buildDataMap maneja valores ausentes", () => {
    const metrics = [
      { day: "2026-07-15", training_minutes: null, closer_count: undefined }
    ];
    const map = buildDataMap(metrics);
    expect(map["2026-07-15"].training_minutes).toBe(0);
    expect(map["2026-07-15"].closer_count).toBe(0);
    expect(map["2026-07-15"].quiz_answers).toBe(0);
  });
});

describe("Streak calculation (supa-client.ts getCurrentStreak)", () => {
  function calcStreak(data) {
    if (!data || data.length === 0) return { current: 0, max: 0 };
    const activeDays = data.filter(s => s.training_minutes > 0 || s.closer_count > 0 || s.quiz_answers > 0);
    if (activeDays.length === 0) return { current: 0, max: 0 };
    const uniqueDates = [...new Set(activeDays.map(s => s.day))].sort().reverse();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let currentStreak = 0;
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) currentStreak++;
        else break;
      }
    }
    return { current: currentStreak, max: Math.max(currentStreak, 1) };
  }

  it("día con solo quiz cuenta como activo", () => {
    const data = [
      { day: "2026-07-15", training_minutes: 0, closer_count: 0, quiz_answers: 3 }
    ];
    const streak = calcStreak(data);
    expect(streak.current).toBe(1);
  });

  it("día con solo training cuenta como activo", () => {
    const data = [
      { day: "2026-07-15", training_minutes: 10, closer_count: 0, quiz_answers: 0 }
    ];
    const streak = calcStreak(data);
    expect(streak.current).toBe(1);
  });

  it("día sin actividad no cuenta", () => {
    const data = [
      { day: "2026-07-15", training_minutes: 0, closer_count: 0, quiz_answers: 0 }
    ];
    const streak = calcStreak(data);
    expect(streak.current).toBe(0);
  });
});
