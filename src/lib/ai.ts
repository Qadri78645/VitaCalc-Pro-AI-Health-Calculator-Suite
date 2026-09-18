import type { AIKnowledgeEntry, AIReply, SavedResult } from './types';
import { calculators } from './calculators';

export const aiKnowledgeBase: AIKnowledgeEntry[] = [
  {
    keywords: ['bmi', 'body mass index', 'motapa', 'obesity', 'overweight', 'موٹاپا', 'وزن'],
    answer: 'BMI (weight kg ÷ height m²) screens weight status: <18.5 underweight, 18.5–24.9 normal, 25–29.9 overweight, 30+ obese (WHO). It cannot see muscle vs fat, so pair it with waist-to-height ratio and body-fat %. A BMI in the normal band is associated with the lowest all-cause mortality. If yours is above 25, a 500 kcal/day deficit + 150 min/week activity safely moves it down ~0.5 kg/week.',
    related: ['bmi', 'waist-height', 'body-fat', 'weight-planner'],
  },
  {
    keywords: ['pregnancy weight', 'pregnancy weight gain', 'weight gain during pregnancy', 'pregnancy', 'pregnant', 'due date', 'conception', 'hamal', 'baby', 'fertility', 'fertile', 'ovulation', 'ovulate', 'fertile window', 'lmp', 'period', 'menstrual', 'حمل', 'حمل میں وزن'],
    answer: 'Due date = LMP + 280 days (Naegele, adjusted for cycle length); only ~5% deliver exactly on it — 37–42 weeks is full-term. Ovulation happens ~14 days before the next period; the fertile window is the 5 days before plus ovulation day. Start folic acid 400–800 µg/day before conception. Weight gain follows IOM ranges by pre-pregnancy BMI (normal BMI: 11.5–16 kg). Limit caffeine to 200 mg/day; avoid alcohol and smoking entirely.',
    related: ['due-date', 'ovulation', 'pregnancy-weight'],
  },
  {
    keywords: ['weight loss', 'lose weight', 'fat loss', 'diet', 'slim', 'wazan', 'وزن کم'],
    answer: 'Sustainable fat loss = moderate calorie deficit (300–500 kcal/day) + high protein (1.6–2.2 g/kg) + resistance training 2–4×/week + 7–9 h sleep. Expect 0.25–0.75 kg/week. Crash diets (<1,200 kcal) trigger metabolic adaptation, muscle loss and rebound. Judge progress by weekly weight averages and waist measurements, not daily scale swings.',
    related: ['tdee', 'weight-planner', 'macros', 'protein-intake'],
  },
  {
    keywords: ['weight gain', 'muscle gain', 'bulk', 'gain weight'],
    answer: 'For lean gain: eat a 300–500 kcal surplus, protein 1.6–2.2 g/kg, and train progressively 3–5×/week. Target 0.25–0.5 kg/week — faster gains are mostly fat. Compound lifts (squat, deadlift, bench, row, overhead press) plus 7–9 h sleep drive the adaptation.',
    related: ['tdee', 'macros', 'one-rep-max', 'protein-intake'],
  },
  {
    keywords: ['calorie', 'calories', 'tdee', 'bmr', 'energy', 'maintenance'],
    answer: 'BMR is what you burn at complete rest (Mifflin-St Jeor is the most accurate formula). TDEE = BMR × activity factor (1.2 sedentary → 1.9 athlete). Eat at TDEE to maintain, −500 to lose ~0.5 kg/week, +300 to gain lean mass. Formulas are starting points — real weight trend over 2 weeks is the truth; adjust ±200 kcal accordingly.',
    related: ['bmr', 'tdee', 'macros', 'harris-benedict'],
  },
  {
    keywords: ['protein', 'whey', 'protien', 'پروٹین'],
    answer: 'Protein needs: sedentary 0.8–1.0 g/kg (RDA minimum), active 1.2–1.6, strength training 1.6–2.2, fat loss while training 1.8–2.4 g/kg. Aim ≥25–30 g per meal to maximise muscle protein synthesis. Great sources: eggs, chicken, fish, daal/lentils, chickpeas, Greek yogurt, paneer, tofu, whey. Protein is also the most satiating macro — the key dietary lever for fat loss.',
    related: ['protein-intake', 'macros', 'lean-body-mass'],
  },
  {
    keywords: ['water', 'hydration', 'pani', 'drink', 'پانی'],
    answer: 'Baseline fluid need ≈ 35 ml/kg/day, plus ~350 ml per 30 min of exercise, plus 400–500 ml in hot climates. About 20% comes from food. Check hydration by urine colour: pale straw = good, dark = drink now. Pregnant women need +300 ml, breastfeeding +700 ml.',
    related: ['water-intake'],
  },
  {
    keywords: ['blood pressure', 'bp', 'hypertension', 'pressure', 'بلڈ پریشر'],
    answer: 'ACC/AHA 2017: normal <120/80, elevated 120–129/<80, stage 1 130–139 or 80–89, stage 2 ≥140 or ≥90, crisis ≥180/120 (emergency). Hypertension is the #1 modifiable stroke risk factor. Biggest levers: weight loss (−1 mmHg/kg), DASH diet (−8 to −14), salt <5 g/day (−5 to −6), exercise (−5 to −8), alcohol reduction. Always average multiple readings taken over days.',
    related: ['blood-pressure', 'heart-risk'],
  },
  {
    keywords: ['cholesterol', 'lipid', 'ldl', 'hdl', 'triglyceride'],
    answer: 'Key lipid targets: LDL <100 mg/dL (<70 if high cardiac risk), HDL ≥40 men/≥50 women, triglycerides <150, non-HDL <130. Ratios matter: total/HDL <3.5 is ideal, triglyceride/HDL <2 suggests good insulin sensitivity. Fix first: cut trans fats & sugar, 25–40 g soluble fibre daily, 150 min/week cardio, omega-3s. Statins are the most proven drug when lifestyle is not enough.',
    related: ['cholesterol-ratio', 'heart-risk'],
  },
  {
    keywords: ['sugar', 'glucose', 'a1c', 'hba1c', 'diabetes', 'shoogar', 'sweet', 'شوگر', 'ذیابیطس'],
    answer: 'HbA1c reflects ~3-month average glucose: <5.7% normal, 5.7–6.4% prediabetes, ≥6.5% diabetes (ADA). Prediabetes is highly reversible: the DPP trial showed 7% weight loss + 150 min/week activity cut progression by 58%. Highest-yield daily habit: 10–15 min walk after meals — it blunts post-meal spikes by up to 30%.',
    related: ['diabetes-risk'],
  },
  {
    keywords: ['kidney', 'egfr', 'creatinine', 'renal', 'gurde', 'گردے'],
    answer: 'eGFR (CKD-EPI 2021) stages kidney function: ≥90 normal, 60–89 mild decrease, 45–59 G3a, 30–44 G3b, 15–29 G4, <15 kidney failure. eGFR <60 for 3+ months = CKD. The two biggest protectors: BP <130/80 and glucose control. Avoid chronic NSAIDs (ibuprofen/diclofenac), stay hydrated, and get a urine albumin test if you have diabetes or hypertension.',
    related: ['egfr', 'creatinine-clearance'],
  },
  {
    keywords: ['heart', 'cardiac', 'cardiovascular', 'attack', 'dil', 'دل'],
    answer: 'Main modifiable heart-disease drivers: blood pressure, LDL cholesterol, smoking, diabetes, inactivity, abdominal fat. A ≥10% 10-year risk usually triggers a statin discussion (ACC/AHA). Mediterranean-style diet cut cardiovascular events ~30% in the PREDIMED trial. Know your numbers: BP <120/80, LDL <100, A1C <5.7, waist < half your height.',
    related: ['heart-risk', 'blood-pressure', 'cholesterol-ratio', 'waist-height'],
  },
  {
    keywords: ['heart rate', 'pulse', 'hr', 'resting'],
    answer: 'Normal resting heart rate: 60–100 bpm; trained athletes often 40–60. Lower resting HR generally means better cardiovascular fitness. Max HR ≈ 208 − 0.7×age (Tanaka). Train mostly (80%) at 60–70% of max (conversational pace), 20% harder. Heart-rate recovery ≥12 bpm in the first minute after hard effort is a strong survival predictor.',
    related: ['max-heart-rate', 'target-heart-rate'],
  },
  {
    keywords: ['exercise', 'workout', 'training', 'gym', 'activity', 'walk', 'ورزش'],
    answer: 'WHO adult guideline: 150–300 min/week moderate cardio (or 75–150 vigorous) + strength training 2×/week + minimal sitting. A practical template: 3 walks of 30–45 min, 2 full-body strength sessions, 1 optional interval session. Consistency beats intensity — 80% adherence to a simple plan outperforms 30% adherence to a perfect one.',
    related: ['calorie-burn', 'steps-calories', 'target-heart-rate', 'one-rep-max'],
  },
  {
    keywords: ['strength', 'lifting', '1rm', 'reps', 'sets', 'muscle building'],
    answer: 'Hypertrophy: 3–5 sets of 8–12 reps at ~70–75% of 1RM, stopping ~2 reps shy of failure, each muscle 2×/week. Strength: 3–6 sets of 2–6 reps at 80–90% with 3–5 min rest. Progressive overload (more weight/reps over time) is the non-negotiable driver. Protein 1.6–2.2 g/kg and 7–9 h sleep complete the equation.',
    related: ['one-rep-max', 'protein-intake', 'lean-body-mass'],
  },
  {
    keywords: ['sleep', 'neend', 'insomnia', 'rest', 'bedtime', 'نیند'],
    answer: 'Adults need 7–9 hours; sleep cycles run ~90 minutes, so wake times at cycle ends (7.5 h or 9 h in bed) reduce grogginess. Non-negotiables: same wake time daily, morning sunlight within 30 min of waking, no caffeine after 2 pm, screens off 1 h before bed, cool dark room. Chronic short sleep (<6 h) raises hypertension, diabetes and obesity risk independently.',
    related: ['sleep-cycle', 'biological-age'],
  },
  {
    keywords: ['stress', 'anxiety', 'tension', 'mental', 'depression', 'ذہنی دباؤ'],
    answer: 'Chronic stress elevates cortisol, which drives abdominal fat, blood pressure and poor sleep — a self-reinforcing loop. Evidence-backed tools: 10 min/day mindfulness, regular aerobic exercise, 7–9 h sleep, social connection. Persistent low mood, hopelessness or anxiety deserves professional support — that is a strength, not a weakness.',
    related: ['biological-age', 'sleep-cycle'],
  },
  {
    keywords: ['smoking', 'cigarette', 'tobacco', 'vape', 'tamaku', 'quit', 'تمباکو'],
    answer: 'Smoking causes ~8 million deaths/year worldwide. Recovery starts immediately after quitting: 20 min → HR/BP drop; 12 h → blood CO normal; 2 weeks → circulation improves; 1 year → coronary risk halves; 10 years → lung-cancer death risk halves. NRT (patches/gum) doubles quit rates. Cravings peak and pass in 3–5 minutes. Most successful quitters needed 3–6 attempts.',
    related: ['quit-smoking', 'biological-age'],
  },
  {
    keywords: ['alcohol', 'drink', 'wine', 'beer', 'bac'],
    answer: 'Low-risk guideline: ≤14 UK units/week, spread over 3+ days, never binge (6+ units/session). Alcohol is a group-1 carcinogen — less is always better, none is best. The liver clears ~1 unit/hour; nothing speeds this up except time. Never drink and drive: the only safe driving BAC is 0.00%.',
    related: ['alcohol-bac'],
  },
  {
    keywords: ['child', 'kid', 'bacha', 'growth', 'percentile', 'بچہ'],
    answer: 'Children (2–18 y) are assessed with BMI-for-age percentiles, not adult cutoffs: <5th underweight, 5th–85th healthy, 85th–95th overweight, ≥95th obesity. Growth trend matters far more than a single point — paediatricians plot every visit on official charts. Foundations: 60 min/day active play, ≤2 h recreational screens, 9–11 h sleep, no sugary drinks. Never restrict a child\u2019s diet without medical supervision.',
    related: ['child-bmi'],
  },
  {
    keywords: ['body fat', 'fat percentage', 'belly', 'visceral'],
    answer: 'Healthy body fat (ACE): men 14–24%, women 21–31%. Visceral (abdominal) fat is the dangerous kind — it drives inflammation and insulin resistance. Waist-to-height ratio <0.5 and waist-to-hip ratio <0.9 (men)/<0.85 (women) are simple proxies. Visceral fat responds fastest to: cardio 150–250 min/week, cutting sugar/refined carbs/alcohol, adequate sleep and a moderate calorie deficit.',
    related: ['body-fat', 'waist-hip', 'waist-height', 'absi'],
  },
  {
    keywords: ['macros', 'macro', 'keto', 'low carb', 'carb', 'fat intake'],
    answer: 'Macros = protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g. Balanced split: 50/25/25 (C/P/F). Low-carb 30/30/40 works well for insulin resistance; keto (5/25/70) can help short-term fat loss and glycaemic control but restricts many whole foods. High-protein (40/35/25) is the best default for fat loss with training.',
    related: ['macros', 'tdee', 'protein-intake'],
  },
  {
    keywords: ['steps', 'walking', '10000', 'stride'],
    answer: 'Mortality benefit keeps improving to ~10,000 steps/day (~7,000 for older adults) — Lancet 2022 meta-analysis. 100 steps/min ≈ moderate intensity. Three 10-minute post-meal walks beat one 30-minute walk for glucose control. Rough math: steps × stride (≈0.415 × height) = distance; walking burns ≈0.53 kcal per kg per km.',
    related: ['steps-calories', 'calorie-burn'],
  },
  {
    keywords: ['fasting', 'intermittent', 'roza', 'ramadan'],
    answer: 'Intermittent fasting (16:8, 5:2) works mainly by reducing total intake. Break fasts with protein + fibre first, not sugar. During Ramadan-style fasting: hydrate 2–3 L between sunset and dawn, prioritise protein and slow carbs at suhoor, and avoid fried food at iftar. People with diabetes, pregnancy, or on medications must consult a doctor before fasting.',
    related: ['macros', 'water-intake'],
  },
  {
    keywords: ['vitamin', 'supplement', 'iron', 'calcium', 'vitamin d'],
    answer: 'Food-first is the evidence-backed default. Commonly justified supplements: vitamin D (1,000–2,000 IU/day where sun exposure is low), B12 for vegetarians/vegans, iron only if bloodwork shows deficiency, folic acid before/during pregnancy, omega-3 if you eat no fish. Megadoses of fat-soluble vitamins (A, D, E, K) can be toxic — test, don\u2019t guess.',
    related: ['protein-intake', 'macros'],
  },
  {
    keywords: ['health score', 'dashboard', 'overall health', 'how am i', 'my results'],
    answer: 'Your Health Dashboard aggregates every saved result into a single 0–100 Health Score with strengths, concerns and a prioritised action plan. Save results from any calculator (the "Save to Dashboard" button) and the AI report updates automatically.',
    related: [],
  },
  {
    keywords: ['hello', 'hi', 'salam', 'assalam', 'hey', 'start', 'adab', 'السلام', 'سلام'],
    answer: 'Assalam-o-Alaikum / Hello! 👋 I am your VitaCalc AI health assistant. Ask me about BMI, weight loss, calories, protein, blood pressure, cholesterol, diabetes, sleep, pregnancy, fitness — anything health-related. I can also explain any calculator result and reference the numbers you have saved to your dashboard. What would you like to know?',
    related: [],
  },
];

const fallbackAnswer = 'I can help with BMI & body composition, calories & macros, protein & hydration, heart rate, blood pressure, cholesterol, blood sugar & diabetes risk, kidney function, sleep, smoking & alcohol, pregnancy and child growth. Try asking, for example: "How do I lower my cholesterol?", "How much protein do I need?" or "What does a healthy blood pressure look like?" — or pick a suggestion below.';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0600-\u06FF-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function routeQuery(query: string, savedResults: SavedResult[]): AIReply {
  let normalized = query.toLowerCase();

  // Urdu keyword augmentation
  if (/[\u0600-\u06FF]/.test(normalized)) {
    if (normalized.includes('سلام') || normalized.includes('السلام')) normalized += ' salam assalam';
    if (normalized.includes('ہیلو')) normalized += ' hello';
    if (normalized.includes('شکریہ')) normalized += ' thanks';
  }

  const tokens = tokenize(normalized);
  let bestEntry: AIKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of aiKnowledgeBase) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.includes(' ') ? 5 : keyword.length > 4 ? 3 : 2;
      }
    }
    for (const token of tokens) {
      if (token.length < 3) continue;
      if (entry.keywords.some((k) => k.includes(token) || token.includes(k))) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Personal context from saved results
  let personal: string | undefined;
  const recentSaved = savedResults.slice(-3);
  if (bestEntry && bestScore > 0 && recentSaved.length > 0) {
    const relevantSaved = recentSaved
      .filter((r) => bestEntry!.related.includes(r.calcId))
      .map((r) => `${r.calcName}: ${r.result.headline} (${r.result.category ?? r.result.headlineLabel})`);
    if (relevantSaved.length > 0) {
      personal = `📋 From your saved results — ${relevantSaved.join(' · ')}. I have taken these into account; re-save after any lifestyle change to update my analysis.`;
    }
  }

  const related = (bestEntry?.related ?? [])
    .map((id) => calculators.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, name: c.name }));

  return {
    answer: bestEntry && bestScore > 0 ? bestEntry.answer : fallbackAnswer,
    related,
    personal,
  };
}

export const suggestedQuestions = [
  'What is a healthy BMI range?',
  'How do I lose weight sustainably?',
  'How much protein do I need daily?',
  'What do my blood pressure numbers mean?',
  'How can I lower cholesterol naturally?',
  'What is prediabetes and is it reversible?',
  'How much sleep do I really need?',
  'What happens to my body when I quit smoking?',
  'How is my due date calculated?',
  'What is VO2 max and why does it matter?',
];
