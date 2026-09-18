import type { Calculator, Tone } from './types';
import { round, clamp, formatDate, addDays, kgToLb, toKg, toCm, num } from './utils';

// ─── Shared field definitions ───
const unitsField = {
  name: 'units', label: 'Measurement system', type: 'select' as const, defaultValue: 'metric',
  options: [
    { value: 'metric', label: 'Metric (kg, cm)' },
    { value: 'imperial', label: 'US / Imperial (lb, ft, in)' },
  ],
};

const sexField = {
  name: 'sex', label: 'Biological sex', type: 'select' as const, defaultValue: 'male',
  options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ],
};

const weightKgField = {
  name: 'kg', label: 'Weight', type: 'number' as const, unit: 'kg', min: 20, max: 350, step: 0.1,
  placeholder: 'e.g. 72', showIf: (v: Record<string, string>) => v.units !== 'imperial',
};

const weightLbField = {
  name: 'lb', label: 'Weight', type: 'number' as const, unit: 'lb', min: 44, max: 770, step: 0.1,
  placeholder: 'e.g. 158', showIf: (v: Record<string, string>) => v.units === 'imperial',
};

const heightCmField = {
  name: 'cm', label: 'Height', type: 'number' as const, unit: 'cm', min: 90, max: 250, step: 0.5,
  placeholder: 'e.g. 172', showIf: (v: Record<string, string>) => v.units !== 'imperial',
};

const heightFtField = {
  name: 'ft', label: 'Height (feet)', type: 'number' as const, unit: 'ft', min: 3, max: 8,
  placeholder: 'e.g. 5', showIf: (v: Record<string, string>) => v.units === 'imperial',
};

const heightInField = {
  name: 'inch', label: 'Height (inches)', type: 'number' as const, unit: 'in', min: 0, max: 11.9,
  placeholder: 'e.g. 8', showIf: (v: Record<string, string>) => v.units === 'imperial',
};

const ageField = {
  name: 'age', label: 'Age', type: 'number' as const, unit: 'years', min: 10, max: 120,
  placeholder: 'e.g. 30',
};

// ─── Mifflin-St Jeor BMR ───
function mifflinBMR(weightKg: number, heightCm: number, age: number, isMale: boolean): number {
  return isMale
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

// ─── BMI category ───
function bmiCategory(bmi: number): { label: string; tone: Tone; score: number } {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warning', score: 55 };
  if (bmi < 25) return { label: 'Normal weight', tone: 'good', score: 95 };
  if (bmi < 30) return { label: 'Overweight', tone: 'caution', score: 65 };
  if (bmi < 35) return { label: 'Obese (Class I)', tone: 'warning', score: 38 };
  if (bmi < 40) return { label: 'Obese (Class II)', tone: 'danger', score: 25 };
  return { label: 'Obese (Class III)', tone: 'danger', score: 15 };
}

// ─── Child BMI percentiles (approximate CDC thresholds) ───
function childBMIRefs(ageYears: number, isMale: boolean): [number, number, number] {
  // Approximate 5th, 85th, 95th percentile BMI values by age
  const boyRefs: [number, number, number][] = [
    [14.0, 18.3, 20.2], [13.9, 18.4, 20.3], [13.8, 18.6, 20.5], [13.7, 18.8, 20.9],
    [13.6, 19.1, 21.3], [13.7, 19.5, 21.9], [13.8, 19.9, 22.5], [14.0, 20.3, 23.1],
    [14.2, 20.8, 23.7], [14.4, 21.3, 24.3], [14.7, 21.9, 25.0], [15.0, 22.5, 25.7],
    [15.3, 23.1, 26.4], [15.7, 23.7, 27.1], [16.1, 24.3, 27.8], [16.5, 24.9, 28.5],
    [17.0, 25.5, 29.2], [17.5, 26.0, 29.9],
  ];
  const girlRefs: [number, number, number][] = [
    [13.7, 18.2, 20.1], [13.6, 18.3, 20.2], [13.5, 18.5, 20.5], [13.4, 18.7, 20.8],
    [13.3, 19.0, 21.2], [13.3, 19.4, 21.7], [13.4, 19.8, 22.3], [13.5, 20.3, 22.9],
    [13.7, 20.8, 23.6], [13.9, 21.3, 24.3], [14.2, 21.9, 25.1], [14.5, 22.5, 25.9],
    [14.8, 23.1, 26.7], [15.2, 23.7, 27.5], [15.6, 24.3, 28.3], [16.0, 24.9, 29.1],
    [16.4, 25.4, 29.9], [16.8, 25.9, 30.6],
  ];
  const refs = isMale ? boyRefs : girlRefs;
  const idx = clamp(Math.floor(ageYears) - 2, 0, refs.length - 1);
  return refs[idx];
}

// ─── Activity MET values ───
const activityOptions = [
  { value: '3.0', label: 'Walking (slow, 3.2 km/h) — MET 3.0' },
  { value: '3.5', label: 'Walking (brisk, 4.8 km/h) — MET 3.5' },
  { value: '4.3', label: 'Walking (very brisk, 5.6 km/h) — MET 4.3' },
  { value: '5.0', label: 'Cycling (leisure, 16 km/h) — MET 5.0' },
  { value: '6.0', label: 'Cycling (moderate, 19 km/h) — MET 6.0' },
  { value: '7.0', label: 'Swimming (moderate) — MET 7.0' },
  { value: '8.0', label: 'Running (8 km/h) — MET 8.0' },
  { value: '9.8', label: 'Running (9.6 km/h) — MET 9.8' },
  { value: '11.0', label: 'Running (11.2 km/h) — MET 11.0' },
  { value: '3.5', label: 'Yoga / stretching — MET 3.5' },
  { value: '5.0', label: 'Dancing (general) — MET 5.0' },
  { value: '6.0', label: 'Aerobics (general) — MET 6.0' },
  { value: '3.5', label: 'Gardening — MET 3.5' },
  { value: '8.0', label: 'Jump rope (moderate) — MET 8.0' },
  { value: '6.0', label: 'HIIT / circuit training — MET 6.0' },
  { value: '3.5', label: 'Housework (general) — MET 3.5' },
  { value: '5.0', label: 'Hiking (cross-country) — MET 5.0' },
  { value: '4.0', label: 'Weight lifting (general) — MET 4.0' },
];

const activityLevelOptions = [
  { value: '1.2', label: 'Sedentary (little or no exercise)' },
  { value: '1.375', label: 'Lightly active (1–3 days/week)' },
  { value: '1.55', label: 'Moderately active (3–5 days/week)' },
  { value: '1.725', label: 'Very active (6–7 days/week)' },
  { value: '1.9', label: 'Extremely active (athlete, physical job)' },
];

const dietStyleOptions = [
  { value: 'balanced', label: 'Balanced (50% C / 25% P / 25% F)' },
  { value: 'lowcarb', label: 'Low-carb (30% C / 30% P / 40% F)' },
  { value: 'keto', label: 'Ketogenic (5% C / 25% P / 70% F)' },
  { value: 'highprotein', label: 'High-protein (40% C / 35% P / 25% F)' },
];

const dietStyleRatios: Record<string, { protein: number; carbs: number; fat: number }> = {
  balanced: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  lowcarb: { protein: 0.3, carbs: 0.3, fat: 0.4 },
  keto: { protein: 0.25, carbs: 0.05, fat: 0.7 },
  highprotein: { protein: 0.35, carbs: 0.4, fat: 0.25 },
};

// ─── All 34 calculators ───
export const calculators: Calculator[] = [
  // ═══════════ BODY COMPOSITION (12) ═══════════
  {
    id: 'bmi', name: 'BMI Calculator', tagline: 'Body Mass Index with healthy weight range',
    description: 'Body Mass Index (BMI) screens for weight category using the WHO international standard. This tool also computes your personal healthy weight range and an AI interpretation of your result.',
    category: 'body', icon: 'Scale', keywords: ['bmi', 'body mass index', 'weight', 'obesity', 'motapa'],
    fields: [unitsField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const m = cm / 100;
      const bmi = kg / (m * m);
      const cat = bmiCategory(bmi);
      const minHealthy = 18.5 * m * m;
      const maxHealthy = 24.9 * m * m;
      const imperial = s.units === 'imperial';
      const fmtW = (w: number) => imperial ? `${round(kgToLb(w))} lb` : `${round(w)} kg`;
      return {
        headline: round(bmi, 1).toFixed(1),
        headlineLabel: 'Your BMI (kg/m²)',
        category: cat.label,
        tone: cat.tone,
        score: Math.round(cat.score),
        gauge: {
          min: 14, max: 42, value: clamp(bmi, 14, 42),
          bands: [
            { from: 14, to: 18.5, label: 'Under', tone: 'warning' },
            { from: 18.5, to: 25, label: 'Normal', tone: 'good' },
            { from: 25, to: 30, label: 'Over', tone: 'caution' },
            { from: 30, to: 35, label: 'Obese I', tone: 'warning' },
            { from: 35, to: 42, label: 'Obese II+', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Healthy weight range', value: `${fmtW(minHealthy)} – ${fmtW(maxHealthy)}`, hint: 'For your height' },
          { label: 'Current weight', value: fmtW(kg) },
          { label: 'Height', value: imperial ? `${round(cm / 2.54 / 12, 0)}′ ${round(cm / 2.54 % 12, 0)}″` : `${round(cm, 0)} cm` },
          {
            label: bmi >= 25 ? 'Weight to lose for normal BMI' : bmi < 18.5 ? 'Weight to gain for normal BMI' : 'Distance from range',
            value: bmi >= 25 ? fmtW(kg - maxHealthy) : bmi < 18.5 ? fmtW(minHealthy - kg) : '0 — in range',
            tone: bmi >= 25 || bmi < 18.5 ? 'caution' : 'good',
          },
        ],
        insights: [
          bmi >= 18.5 && bmi < 25
            ? 'Your BMI sits inside the WHO normal range (18.5–24.9), which is statistically linked to the lowest risk of cardiovascular disease and type 2 diabetes.'
            : bmi < 18.5
              ? `A BMI of ${round(bmi, 1)} is below the WHO threshold of 18.5. Underweight status can weaken immunity, reduce bone density and affect hormonal balance.`
              : `A BMI of ${round(bmi, 1)} is above the WHO normal range. Each 5-point increase in BMI roughly doubles the risk of developing type 2 diabetes.`,
          'BMI does not distinguish muscle from fat — athletes and very muscular people can show a high BMI while being metabolically healthy. Cross-check with the Body Fat % and Waist-to-Height tools.',
          `To reach a BMI of 21.7 (the statistical health optimum), your target weight would be ${fmtW(21.7 * m * m)}.`,
        ],
        advice: bmi >= 18.5 && bmi < 25
          ? ['Maintain 150+ minutes of moderate activity per week.', 'Keep protein and fibre intake consistent to protect lean mass.']
          : bmi < 18.5
            ? ['Add 300–500 kcal/day from nutrient-dense foods (nuts, dairy, eggs, olive oil).', 'Start resistance training 2–3×/week to build muscle rather than fat.', 'Consult a doctor to rule out thyroid or absorption issues.']
            : ['A 500 kcal/day deficit yields a safe ~0.5 kg loss per week — try the Weight Planner.', 'Prioritise whole foods, 25–35 g fibre and 30 g+ protein per meal.', 'Combine cardio with resistance training to preserve muscle while losing fat.'],
      };
    },
  },
  {
    id: 'bmr', name: 'BMR Calculator', tagline: 'Basal Metabolic Rate (Mifflin-St Jeor)',
    description: 'Your Basal Metabolic Rate is the energy your body burns at complete rest — for breathing, circulation and cell repair. Computed with the Mifflin-St Jeor equation, the most accurate formula recommended by the American Dietetic Association.',
    category: 'body', icon: 'Flame', keywords: ['bmr', 'basal', 'metabolic', 'metabolism', 'calories at rest'],
    fields: [unitsField, sexField, ageField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const age = num(s.age, 30);
      const isMale = s.sex !== 'female';
      const bmr = mifflinBMR(kg, cm, age, isMale);
      return {
        headline: `${Math.round(bmr)}`,
        headlineLabel: 'Calories burned at rest / day (kcal)',
        category: 'Mifflin-St Jeor equation',
        tone: 'info',
        metrics: [
          { label: 'Per hour', value: `${Math.round(bmr / 24)} kcal` },
          { label: 'Per minute', value: `${round(bmr / 1440, 1)} kcal` },
          { label: 'Fat-burn equivalent', value: `${round(bmr / 7700, 2)} kg fat / day`, hint: 'If fasting completely (not recommended)' },
          { label: 'Estimated TDEE (moderate activity)', value: `${Math.round(bmr * 1.55)} kcal`, hint: 'BMR × 1.55 activity factor' },
        ],
        insights: [
          `Your body spends roughly ${Math.round(bmr)} kcal every day just keeping you alive — about ${isMale ? '70%' : '65–70%'} of your total daily energy expenditure.`,
          'BMR declines ~2–3% per decade after age 20, mainly through loss of lean muscle. Resistance training is the most effective way to slow this decline.',
          'Eating far below your BMR for long periods can trigger metabolic adaptation — hormonal down-regulation that makes further fat loss harder.',
        ],
        advice: [
          'Use your BMR as a floor: most adults should not eat below it without medical supervision.',
          'Multiply BMR by an activity factor (see the TDEE calculator) to plan daily intake.',
          'Build muscle with 2–3 strength sessions weekly to permanently raise your BMR.',
        ],
      };
    },
  },
  {
    id: 'harris-benedict', name: 'Harris-Benedict BEE', tagline: 'Classic basal energy expenditure formula',
    description: 'The revised Harris-Benedict equation estimates Basal Energy Expenditure (BEE). It is widely used in clinical nutrition settings and makes a useful cross-check against the Mifflin-St Jeor BMR.',
    category: 'body', icon: 'Calculator', keywords: ['harris', 'benedict', 'bee', 'basal energy'],
    fields: [unitsField, sexField, ageField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const age = num(s.age, 30);
      const isMale = s.sex !== 'female';
      const bee = isMale
        ? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age
        : 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age;
      const mifflin = mifflinBMR(kg, cm, age, isMale);
      return {
        headline: `${Math.round(bee)}`,
        headlineLabel: 'Basal Energy Expenditure (kcal/day)',
        category: 'Revised Harris-Benedict (1984)',
        tone: 'info',
        metrics: [
          { label: 'Mifflin-St Jeor BMR', value: `${Math.round(mifflin)} kcal`, hint: 'Modern comparison formula' },
          { label: 'Difference', value: `${Math.round(bee - mifflin)} kcal`, hint: bee > mifflin ? 'Harris-Benedict tends to over-estimate by ~5%' : 'Formulas closely agree' },
          { label: 'Stress factor (illness, ×1.3)', value: `${Math.round(bee * 1.3)} kcal`, hint: 'Clinical adjustment' },
        ],
        insights: [
          `Harris-Benedict estimates ${Math.round(bee)} kcal/day for you — within ${round(Math.abs(bee - mifflin) / mifflin * 100, 1)}% of the Mifflin-St Jeor result.`,
          'Clinical dietitians often average both formulas when prescribing nutrition for patients.',
        ],
        advice: [
          'For everyday planning, prefer the TDEE calculator which builds on Mifflin-St Jeor.',
          'Track real weight for 2 weeks and adjust intake ±200 kcal based on the trend — formulas are estimates, your body is the truth.',
        ],
      };
    },
  },
  {
    id: 'tdee', name: 'TDEE & Calorie Needs', tagline: 'Total daily energy expenditure + goal zones',
    description: 'TDEE is the total calories you burn each day. This calculator derives it from your BMR and activity level, then maps out precise calorie targets for fat loss, maintenance and muscle gain.',
    category: 'body', icon: 'Zap', keywords: ['tdee', 'calorie', 'maintenance', 'cutting', 'bulking', 'energy'],
    fields: [unitsField, sexField, ageField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField, { name: 'activity', label: 'Activity level', type: 'select', defaultValue: '1.55', options: activityLevelOptions }],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const age = num(s.age, 30);
      const isMale = s.sex !== 'female';
      const bmr = mifflinBMR(kg, cm, age, isMale);
      const activityFactor = num(s.activity, 1.55);
      const tdee = bmr * activityFactor;
      return {
        headline: `${Math.round(tdee)}`,
        headlineLabel: 'Maintenance calories (kcal/day)',
        category: `Activity factor ×${activityFactor}`,
        tone: 'info',
        metrics: [
          { label: 'Basal Metabolic Rate', value: `${Math.round(bmr)} kcal` },
          { label: 'Aggressive fat loss (−20%)', value: `${Math.round(tdee * 0.8)} kcal`, tone: 'caution', hint: 'Fast but harder to sustain' },
          { label: 'Moderate fat loss (−500)', value: `${Math.round(tdee - 500)} kcal`, tone: 'good', hint: '~0.5 kg/week — recommended' },
          { label: 'Slow fat loss (−250)', value: `${Math.round(tdee - 250)} kcal`, tone: 'good', hint: '~0.25 kg/week' },
          { label: 'Lean muscle gain (+300)', value: `${Math.round(tdee + 300)} kcal`, tone: 'info', hint: 'With progressive resistance training' },
        ],
        insights: [
          `You burn about ${Math.round(tdee)} kcal/day. One kilogram of body fat stores ≈7,700 kcal, so a 500 kcal daily deficit translates to ~0.5 kg fat loss per week.`,
          'Most people over-estimate their activity level. If weight does not move after 2 weeks of tracking, drop one activity tier.',
          tdee - 500 < (isMale ? 1500 : 1200)
            ? '⚠ A 500-kcal deficit would take you below the general safety floor (1,500 kcal for men, 1,200 for women). Use the smaller −250 kcal deficit instead, or add activity — never eat below the floor without medical supervision.'
            : 'Your numbers leave healthy room for a sustainable deficit without dipping below safety floors.',
        ],
        advice: [
          'Weigh yourself daily under the same conditions and judge by the weekly average, not single days.',
          'Keep protein at 1.6–2.2 g per kg of body weight while in a deficit to protect muscle.',
          'Re-run this calculator every 5 kg of change — your TDEE moves with your weight.',
        ],
      };
    },
  },
  {
    id: 'body-fat', name: 'Body Fat Percentage', tagline: 'US Navy method — no calipers needed',
    description: 'Estimates body fat percentage from tape measurements using the US Navy circumference method, then classifies it against the American Council on Exercise (ACE) standards for your sex.',
    category: 'body', icon: 'Ruler', keywords: ['body fat', 'fat percentage', 'navy', 'tape'],
    fields: [
      unitsField, sexField, heightCmField, heightFtField, heightInField,
      { name: 'neckCm', label: 'Neck circumference', type: 'number', unit: 'cm', min: 20, max: 80, step: 0.5, placeholder: 'Below the larynx', showIf: (v) => v.units !== 'imperial' },
      { name: 'neckIn', label: 'Neck circumference', type: 'number', unit: 'in', min: 8, max: 32, step: 0.25, placeholder: 'Below the larynx', showIf: (v) => v.units === 'imperial' },
      { name: 'waistCm', label: 'Waist circumference', type: 'number', unit: 'cm', min: 40, max: 200, step: 0.5, placeholder: 'At navel, relaxed', showIf: (v) => v.units !== 'imperial' },
      { name: 'waistIn', label: 'Waist circumference', type: 'number', unit: 'in', min: 16, max: 80, step: 0.25, placeholder: 'At navel, relaxed', showIf: (v) => v.units === 'imperial' },
      { name: 'hipCm', label: 'Hip circumference', type: 'number', unit: 'cm', min: 50, max: 220, step: 0.5, placeholder: 'Widest point', showIf: (v) => v.sex === 'female' && v.units !== 'imperial' },
      { name: 'hipIn', label: 'Hip circumference', type: 'number', unit: 'in', min: 20, max: 88, step: 0.25, placeholder: 'Widest point', showIf: (v) => v.sex === 'female' && v.units === 'imperial' },
    ],
    compute: (s) => {
      const heightCm = toCm(s.units, s.cm, s.ft, s.inch);
      const isMale = s.sex !== 'female';
      const imperial = s.units === 'imperial';
      const toCmVal = (cmVal: string, inVal: string) => imperial ? num(inVal, 0) * 2.54 : num(cmVal, 0);
      const neck = toCmVal(s.neckCm, s.neckIn);
      const waist = toCmVal(s.waistCm, s.waistIn);
      const hip = toCmVal(s.hipCm, s.hipIn);
      let bodyFat: number;
      if (isMale) {
        const diff = Math.max(1, waist - neck);
        bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450;
      } else {
        const diff = Math.max(1, waist + hip - neck);
        bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(heightCm)) - 450;
      }
      bodyFat = clamp(bodyFat, 2, 70);
      let label: string, tone: Tone, score: number;
      if (isMale) {
        if (bodyFat < 6) { label = 'Essential fat'; tone = 'caution'; score = 60; }
        else if (bodyFat < 14) { label = 'Athletic'; tone = 'good'; score = 95; }
        else if (bodyFat < 18) { label = 'Fitness'; tone = 'good'; score = 88; }
        else if (bodyFat < 25) { label = 'Average'; tone = 'caution'; score = 65; }
        else { label = 'Above average (obese range)'; tone = 'danger'; score = 35; }
      } else {
        if (bodyFat < 14) { label = 'Essential fat'; tone = 'caution'; score = 60; }
        else if (bodyFat < 21) { label = 'Athletic'; tone = 'good'; score = 95; }
        else if (bodyFat < 25) { label = 'Fitness'; tone = 'good'; score = 88; }
        else if (bodyFat < 32) { label = 'Average'; tone = 'caution'; score = 65; }
        else { label = 'Above average (obese range)'; tone = 'danger'; score = 35; }
      }
      return {
        headline: `${round(bodyFat, 1)}%`,
        headlineLabel: 'Estimated body fat',
        category: `${label} — ACE standard`,
        tone,
        score: Math.round(score),
        gauge: {
          min: isMale ? 3 : 10, max: isMale ? 35 : 45, value: clamp(bodyFat, isMale ? 3 : 10, isMale ? 35 : 45),
          bands: isMale
            ? [
              { from: 3, to: 6, label: 'Essential', tone: 'caution' },
              { from: 6, to: 14, label: 'Athletic', tone: 'good' },
              { from: 14, to: 18, label: 'Fitness', tone: 'good' },
              { from: 18, to: 25, label: 'Average', tone: 'caution' },
              { from: 25, to: 35, label: 'Obese', tone: 'danger' },
            ]
            : [
              { from: 10, to: 14, label: 'Essential', tone: 'caution' },
              { from: 14, to: 21, label: 'Athletic', tone: 'good' },
              { from: 21, to: 25, label: 'Fitness', tone: 'good' },
              { from: 25, to: 32, label: 'Average', tone: 'caution' },
              { from: 32, to: 45, label: 'Obese', tone: 'danger' },
            ],
        },
        metrics: [
          { label: 'Healthy range (ACE)', value: isMale ? '14–24%' : '21–31%' },
          { label: 'Essential fat minimum', value: isMale ? '2–5%' : '10–13%', hint: 'Below this is dangerous' },
          { label: 'Measurement method', value: 'US Navy circumference', hint: '±3% typical accuracy' },
        ],
        insights: [
          `At ${round(bodyFat, 1)}% body fat you fall in the "${label}" band for ${isMale ? 'men' : 'women'} according to the American Council on Exercise.`,
          'Body fat percentage is a stronger predictor of metabolic health than BMI because it separates fat mass from muscle mass.',
          bodyFat > (isMale ? 25 : 32)
            ? 'Excess body fat — especially around the abdomen — raises inflammation, insulin resistance and cardiovascular risk.'
            : 'Your body-fat level is within a metabolically protective range. Consistency now is cheaper than correction later.',
        ],
        advice: [
          'Measure at the same time of day (morning, before eating) for comparable numbers.',
          'To lose fat: moderate calorie deficit + high protein + resistance training 2–4×/week.',
          'Re-measure every 4 weeks — tape measurements move slower than the scale suggests.',
        ],
      };
    },
  },
  {
    id: 'ideal-weight', name: 'Ideal Body Weight', tagline: 'Four classic medical formulas compared',
    description: 'Computes your ideal body weight using four physician-standard formulas — Devine, Robinson, Miller and Hamwi — originally created for medication dosing, and shows the healthy BMI-based range alongside.',
    category: 'body', icon: 'Target', keywords: ['ideal weight', 'ibw', 'devine', 'target weight'],
    fields: [unitsField, sexField, heightCmField, heightFtField, heightInField],
    compute: (s) => {
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const isMale = s.sex !== 'female';
      const inchesOver5Ft = Math.max(0, cm / 2.54 - 60);
      const devine = (isMale ? 50 : 45.5) + 2.3 * inchesOver5Ft;
      const robinson = (isMale ? 52 : 49) + (isMale ? 1.9 : 1.7) * inchesOver5Ft;
      const miller = (isMale ? 56.2 : 53.1) + (isMale ? 1.41 : 1.36) * inchesOver5Ft;
      const hamwi = (isMale ? 48 : 45.5) + (isMale ? 2.7 : 2.2) * inchesOver5Ft;
      const avg = (devine + robinson + miller + hamwi) / 4;
      const m = cm / 100;
      const imperial = s.units === 'imperial';
      const fmt = (w: number) => imperial ? `${round(kgToLb(w))} lb` : `${round(w)} kg`;
      return {
        headline: fmt(avg),
        headlineLabel: 'Ideal weight (4-formula average)',
        category: `For a height of ${round(cm, 0)} cm`,
        tone: 'info',
        metrics: [
          { label: 'Devine formula (1974)', value: fmt(devine), hint: 'Most used in medicine' },
          { label: 'Robinson formula (1983)', value: fmt(robinson) },
          { label: 'Miller formula (1983)', value: fmt(miller) },
          { label: 'Hamwi formula (1964)', value: fmt(hamwi) },
          { label: 'Healthy BMI range', value: `${fmt(18.5 * m * m)} – ${fmt(24.9 * m * m)}`, tone: 'good' },
        ],
        insights: [
          `The four formulas agree within ${fmt(Math.max(devine, robinson, miller, hamwi) - Math.min(devine, robinson, miller, hamwi))} for your height — a tight, reliable estimate.`,
          'Ideal weight formulas ignore frame size and muscle mass; treat the result as a target zone, not an exact number.',
          'If the formula result falls inside your healthy BMI range, it is a safe and realistic long-term goal.',
        ],
        advice: [
          'Aim for the overlap between the formula average and your BMI healthy range.',
          'Approach the target at ≤0.5 kg/week to maximise fat loss and minimise muscle loss.',
          'Use the Weight Planner calculator to get an exact date and calorie target.',
        ],
      };
    },
  },
  {
    id: 'waist-hip', name: 'Waist-to-Hip Ratio', tagline: 'WHO fat-distribution risk screening',
    description: 'Waist-to-hip ratio (WHR) reveals where your body stores fat. Abdominal (visceral) fat is far more metabolically dangerous than hip or thigh fat — WHO uses WHR as a cardiovascular risk marker.',
    category: 'body', icon: 'Hourglass', keywords: ['whr', 'waist hip', 'visceral', 'belly fat'],
    fields: [
      sexField,
      { name: 'waist', label: 'Waist circumference', type: 'number', unit: 'cm', min: 40, max: 200, step: 0.5, placeholder: 'Narrowest point / navel' },
      { name: 'hip', label: 'Hip circumference', type: 'number', unit: 'cm', min: 50, max: 220, step: 0.5, placeholder: 'Widest point' },
    ],
    compute: (s) => {
      const waist = num(s.waist, 0);
      const hip = num(s.hip, 1);
      const isMale = s.sex !== 'female';
      const ratio = waist / hip;
      let label: string, tone: Tone, score: number;
      if (isMale) {
        if (ratio < 0.9) { label = 'Low risk'; tone = 'good'; score = 92; }
        else if (ratio < 1) { label = 'Moderate risk'; tone = 'caution'; score = 60; }
        else { label = 'High risk'; tone = 'danger'; score = 30; }
      } else {
        if (ratio < 0.85) { label = 'Low risk'; tone = 'good'; score = 92; }
        else if (ratio < 0.9) { label = 'Moderate risk'; tone = 'caution'; score = 60; }
        else { label = 'High risk'; tone = 'danger'; score = 30; }
      }
      return {
        headline: round(ratio, 2).toFixed(2),
        headlineLabel: 'Waist-to-hip ratio',
        category: `${label} (WHO, ${isMale ? 'men' : 'women'})`,
        tone,
        score: Math.round(score),
        gauge: {
          min: 0.6, max: 1.2, value: clamp(ratio, 0.6, 1.2),
          bands: isMale
            ? [
              { from: 0.6, to: 0.9, label: 'Low risk', tone: 'good' },
              { from: 0.9, to: 1, label: 'Moderate', tone: 'caution' },
              { from: 1, to: 1.2, label: 'High', tone: 'danger' },
            ]
            : [
              { from: 0.6, to: 0.85, label: 'Low risk', tone: 'good' },
              { from: 0.85, to: 0.9, label: 'Moderate', tone: 'caution' },
              { from: 0.9, to: 1.2, label: 'High', tone: 'danger' },
            ],
        },
        metrics: [
          { label: 'WHO healthy cutoff', value: isMale ? '< 0.90 (men)' : '< 0.85 (women)' },
          { label: 'Waist', value: `${round(waist)} cm` },
          { label: 'Hip', value: `${round(hip)} cm` },
        ],
        insights: [
          ratio >= (isMale ? 1 : 0.9)
            ? 'Your ratio indicates an "apple" fat pattern. Visceral fat around organs releases inflammatory cytokines and is strongly linked to heart disease, stroke and type 2 diabetes.'
            : 'Your ratio indicates a healthier "pear" fat pattern — fat stored in hips and thighs carries far lower metabolic risk.',
          'WHR predicts cardiovascular events better than BMI in many studies, because it captures dangerous central fat specifically.',
          'A 0.1 improvement in WHR is associated with a measurable drop in cardiac risk — small waist changes matter.',
        ],
        advice: [
          'Visceral fat responds fastest to cardio: 150–250 min/week of brisk walking, cycling or swimming.',
          'Cut added sugar, refined carbs and alcohol — the three biggest drivers of belly fat.',
          'Re-measure monthly; waist typically shrinks before the scale moves.',
        ],
      };
    },
  },
  {
    id: 'waist-height', name: 'Waist-to-Height Ratio', tagline: '"Keep your waist under half your height"',
    description: 'Waist-to-height ratio (WHtR) is a simple, powerful screening tool endorsed by NICE (UK). The rule of thumb: a healthy waist should measure less than half your height.',
    category: 'body', icon: 'AlignVerticalJustifyCenter', keywords: ['whtr', 'waist height', 'central obesity'],
    fields: [
      { name: 'waist', label: 'Waist circumference', type: 'number', unit: 'cm', min: 40, max: 200, step: 0.5, placeholder: 'At navel, relaxed' },
      { name: 'height', label: 'Height', type: 'number', unit: 'cm', min: 90, max: 250, step: 0.5, placeholder: 'e.g. 172' },
    ],
    compute: (s) => {
      const ratio = num(s.waist, 0) / num(s.height, 1);
      const height = num(s.height, 170);
      let label: string, tone: Tone, score: number;
      if (ratio < 0.4) { label = 'Underweight / very slim'; tone = 'caution'; score = 65; }
      else if (ratio < 0.5) { label = 'Healthy'; tone = 'good'; score = 95; }
      else if (ratio < 0.6) { label = 'Overweight'; tone = 'caution'; score = 55; }
      else { label = 'Obese'; tone = 'danger'; score = 25; }
      return {
        headline: round(ratio, 2).toFixed(2),
        headlineLabel: 'Waist-to-height ratio',
        category: label,
        tone,
        score: Math.round(score),
        gauge: {
          min: 0.3, max: 0.8, value: clamp(ratio, 0.3, 0.8),
          bands: [
            { from: 0.3, to: 0.4, label: 'Slim', tone: 'caution' },
            { from: 0.4, to: 0.5, label: 'Healthy', tone: 'good' },
            { from: 0.5, to: 0.6, label: 'Over', tone: 'caution' },
            { from: 0.6, to: 0.8, label: 'Obese', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Healthy target', value: `< ${round(height / 2)} cm waist`, hint: 'Half your height' },
          { label: 'Current waist', value: `${round(num(s.waist, 0))} cm` },
          { label: 'String test', value: ratio < 0.5 ? 'PASS ✓' : 'Needs work', tone: ratio < 0.5 ? 'good' : 'caution', hint: 'Height string should encircle waist 2×' },
        ],
        insights: [
          'A 2012 meta-analysis found WHtR outperformed BMI at predicting diabetes, hypertension and heart attacks across ethnicities.',
          ratio >= 0.5
            ? `Your waist is ${round((ratio - 0.5) * height)} cm above the "half your height" line. Bringing it under that mark is one of the highest-impact health changes you can make.`
            : 'You are inside the protective zone — under half your height. This is associated with substantially lower cardiometabolic risk.',
        ],
        advice: [
          'The "string test": cut a string to your height; if it wraps your waist twice, you pass.',
          'Combine a modest calorie deficit with daily 8–10k steps to reduce waist circumference.',
          'Track waist monthly — it is a more honest metric than weight for central fat.',
        ],
      };
    },
  },
  {
    id: 'bsa', name: 'Body Surface Area', tagline: 'Clinical BSA for drug dosing (Du Bois & Mosteller)',
    description: 'Body surface area is the standard reference for chemotherapy dosing, cardiac index and many clinical medications. Computed with both the Du Bois and Mosteller formulas.',
    category: 'body', icon: 'Expand', keywords: ['bsa', 'body surface area', 'dosing', 'du bois', 'mosteller'],
    fields: [
      { name: 'kg', label: 'Weight', type: 'number', unit: 'kg', min: 2, max: 350, step: 0.1, placeholder: 'e.g. 72' },
      { name: 'cm', label: 'Height', type: 'number', unit: 'cm', min: 30, max: 250, step: 0.5, placeholder: 'e.g. 172' },
    ],
    compute: (s) => {
      const kg = num(s.kg, 0);
      const cm = num(s.cm, 0);
      const duBois = 0.007184 * Math.pow(cm, 0.725) * Math.pow(kg, 0.425);
      const mosteller = Math.sqrt(cm * kg / 3600);
      return {
        headline: `${round(duBois, 2)} m²`,
        headlineLabel: 'Body surface area (Du Bois)',
        category: 'Clinical standard',
        tone: 'info',
        metrics: [
          { label: 'Mosteller formula', value: `${round(mosteller, 2)} m²`, hint: 'Preferred in chemotherapy' },
          { label: 'Average adult BSA', value: '1.7–1.9 m²' },
          { label: 'Difference between formulas', value: `${round(Math.abs(duBois - mosteller), 3)} m²` },
        ],
        insights: [
          'BSA scales drug doses more accurately than body weight for many medications because it correlates with metabolic mass, blood volume and kidney clearance.',
          'The two formulas agree closely in adults; Mosteller is favoured in oncology for its simplicity and validation.',
        ],
        advice: [
          'Always let a clinician confirm medication doses — this tool provides the standard formulas, not prescriptions.',
          'For children, BSA-based dosing is especially important; double-check with paediatric references.',
        ],
      };
    },
  },
  {
    id: 'lean-body-mass', name: 'Lean Body Mass', tagline: 'Boer formula — muscle, bone & organ mass',
    description: 'Lean body mass (LBM) is everything in your body that is not fat: muscle, bone, organs and water. It drives your metabolism and is the key number for protein and training planning.',
    category: 'body', icon: 'Dumbbell', keywords: ['lbm', 'lean mass', 'muscle', 'boer'],
    fields: [unitsField, sexField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const isMale = s.sex !== 'female';
      const lbm = isMale
        ? 0.407 * kg + 0.267 * cm - 19.2
        : 0.252 * kg + 0.473 * cm - 48.3;
      const fatMass = kg - lbm;
      const bodyFatPct = fatMass / kg * 100;
      const imperial = s.units === 'imperial';
      const fmt = (w: number) => imperial ? `${round(kgToLb(w))} lb` : `${round(w)} kg`;
      return {
        headline: fmt(lbm),
        headlineLabel: 'Estimated lean body mass',
        category: 'Boer formula (1984)',
        tone: 'info',
        metrics: [
          { label: 'Fat mass (estimated)', value: fmt(fatMass) },
          {
            label: 'Implied body fat %',
            value: `${round(bodyFatPct, 1)}%`,
            tone: isMale ? (bodyFatPct < 25 ? 'good' : 'caution') : (bodyFatPct < 32 ? 'good' : 'caution'),
          },
          { label: 'LBM share of weight', value: `${round(lbm / kg * 100, 1)}%` },
          { label: 'Protein target (1.8 g/kg LBM)', value: `${Math.round(lbm * 1.8)} g/day`, tone: 'good', hint: 'Optimal for muscle retention' },
        ],
        insights: [
          `Roughly ${fmt(lbm)} of your ${fmt(kg)} body weight is lean tissue. Lean mass burns ~13 kcal/kg/day at rest versus ~4.5 kcal/kg for fat — muscle is metabolically expensive in the best way.`,
          'During weight loss, up to 25% of the loss can be lean mass if protein and resistance training are neglected.',
          'Sarcopenia (age-related muscle loss) begins around 30 at ~3–8% per decade; LBM tracking catches it early.',
        ],
        advice: [
          `Eat about ${Math.round(lbm * 1.6)}–${Math.round(lbm * 2.2)} g of protein daily to support your lean mass.`,
          'Resistance-train each muscle group 2×/week with progressive overload.',
          'Re-run this every 8–12 weeks of training to verify that gains are lean, not fat.',
        ],
      };
    },
  },
  {
    id: 'absi', name: 'Body Shape Index (ABSI)', tagline: 'Mortality risk from shape, not size',
    description: 'A Body Shape Index refines waist circumference by normalising it against BMI and height. Published in PLOS ONE (2012), higher ABSI correlates with premature mortality risk independently of BMI.',
    category: 'body', icon: 'Activity', keywords: ['absi', 'body shape', 'mortality', 'waist'],
    fields: [
      { name: 'waist', label: 'Waist circumference', type: 'number', unit: 'cm', min: 40, max: 200, step: 0.5, placeholder: 'At navel' },
      { name: 'kg', label: 'Weight', type: 'number', unit: 'kg', min: 20, max: 350, step: 0.1, placeholder: 'e.g. 72' },
      { name: 'cm', label: 'Height', type: 'number', unit: 'cm', min: 90, max: 250, step: 0.5, placeholder: 'e.g. 172' },
    ],
    compute: (s) => {
      const waistM = num(s.waist, 85) / 100;
      const kg = num(s.kg, 70);
      const heightM = num(s.cm, 172) / 100;
      const bmi = kg / (heightM * heightM);
      const absiVal = waistM / (Math.pow(bmi, 2 / 3) * Math.pow(heightM, 1 / 2));
      const absi = (isNaN(absiVal) || !isFinite(absiVal)) ? 0.0805 : absiVal;
      let label: string, tone: Tone, score: number;
      if (absi < 0.074) { label = 'Low risk'; tone = 'good'; score = 90; }
      else if (absi < 0.081) { label = 'Average risk'; tone = 'caution'; score = 70; }
      else if (absi < 0.088) { label = 'High risk'; tone = 'warning'; score = 45; }
      else { label = 'Very high risk'; tone = 'danger'; score = 25; }
      return {
        headline: absi.toFixed(4),
        headlineLabel: 'A Body Shape Index (m¹¹ᐟ⁶/kg²ᐟ³)',
        category: label,
        tone,
        score: Math.round(score),
        gauge: {
          min: 0.06, max: 0.1, value: clamp(absi, 0.06, 0.1),
          bands: [
            { from: 0.06, to: 0.074, label: 'Low', tone: 'good' },
            { from: 0.074, to: 0.081, label: 'Average', tone: 'caution' },
            { from: 0.081, to: 0.088, label: 'High', tone: 'warning' },
            { from: 0.088, to: 0.1, label: 'Very high', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Your BMI (used in formula)', value: round(bmi, 1).toFixed(1) },
          { label: 'Population mean ABSI', value: '≈ 0.0805' },
          { label: 'Waist', value: `${round(num(s.waist, 0))} cm` },
        ],
        insights: [
          'In the original cohort, people in the highest ABSI band faced up to a 2× greater premature-mortality risk than the lowest band — even at identical BMI.',
          absi >= 0.081
            ? 'Your ABSI is above the population mean, indicating central fat concentration beyond what BMI alone reveals.'
            : 'Your ABSI is at or below the population mean — a favourable body shape for long-term health.',
        ],
        advice: [
          'ABSI improves mainly by shrinking waist circumference: cardio + whole-food diet + sleep 7–9 h.',
          'Pair this result with Waist-to-Height Ratio for a complete central-obesity picture.',
        ],
      };
    },
  },
  {
    id: 'weight-planner', name: 'Weight Goal Planner', tagline: 'AI-planned timeline & daily calorie target',
    description: 'Set a target weight and pace — the planner computes the exact date you will reach it, the daily calorie adjustment required, and flags goals that are too aggressive to be safe or sustainable.',
    category: 'body', icon: 'CalendarCheck', keywords: ['weight loss plan', 'goal', 'timeline', 'diet plan'],
    fields: [
      unitsField, sexField, ageField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField,
      { name: 'goalKg', label: 'Goal weight', type: 'number', unit: 'kg', min: 30, max: 300, step: 0.1, placeholder: 'e.g. 68', showIf: (v) => v.units !== 'imperial' },
      { name: 'goalLb', label: 'Goal weight', type: 'number', unit: 'lb', min: 66, max: 660, step: 0.1, placeholder: 'e.g. 150', showIf: (v) => v.units === 'imperial' },
      {
        name: 'pace', label: 'Weekly pace', type: 'select', defaultValue: '0.5',
        options: [
          { value: '0.25', label: 'Gentle — 0.25 kg/week' },
          { value: '0.5', label: 'Recommended — 0.5 kg/week' },
          { value: '0.75', label: 'Fast — 0.75 kg/week' },
          { value: '1', label: 'Aggressive — 1 kg/week' },
        ],
      },
    ],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const age = num(s.age, 30);
      const isMale = s.sex !== 'female';
      const imperial = s.units === 'imperial';
      const goalKg = imperial ? num(s.goalLb, kg) / 2.2046226218 : num(s.goalKg, kg);
      const diff = kg - goalKg;
      const pace = Math.abs(num(s.pace, 0.5));
      const weeks = Math.abs(diff) / pace;
      const targetDate = addDays(new Date(), Math.round(weeks * 7));
      const maintenance = mifflinBMR(kg, cm, age, isMale) * 1.55;
      const dailyAdjust = diff >= 0 ? -(pace * 7700) / 7 : (pace * 7700) / 7;
      const calorieTarget = Math.max(
        diff >= 0 && isMale ? 1500 : 1200,
        maintenance + dailyAdjust,
      );
      const fmt = (w: number) => imperial ? `${round(kgToLb(w))} lb` : `${round(w)} kg`;
      const isLosing = diff > 0.05;
      const isGaining = diff < -0.05;
      const action = isLosing ? 'lose' : isGaining ? 'gain' : 'maintain';
      const safePace = pace <= 1;
      return {
        headline: formatDate(targetDate),
        headlineLabel: `Projected date to ${fmt(goalKg)}`,
        category: weeks < 1 ? 'Already at goal' : `${Math.ceil(weeks)} weeks (${round(weeks / 4.35, 1)} months)`,
        tone: safePace ? 'good' : 'warning',
        score: safePace ? 85 : 55,
        metrics: [
          { label: `Weight to ${action}`, value: fmt(Math.abs(diff)) },
          { label: 'Maintenance calories (est.)', value: `${Math.round(maintenance)} kcal/day` },
          {
            label: 'Daily calorie target',
            value: `${Math.round(calorieTarget)} kcal/day`,
            tone: calorieTarget < 1200 ? 'danger' : 'good',
            hint: `${dailyAdjust >= 0 ? '+' : ''}${Math.round(dailyAdjust)} kcal adjustment`,
          },
          { label: 'Weekly pace', value: `${pace} kg/week`, tone: safePace ? 'good' : 'warning' },
        ],
        insights: [
          `At ${pace} kg/week you would reach ${fmt(goalKg)} around ${formatDate(targetDate)} — ${Math.ceil(weeks)} weeks from today.`,
          safePace
            ? 'Your chosen pace is within the safe, evidence-backed zone (0.25–1 kg/week).'
            : '⚠ A pace above 1 kg/week raises the risk of muscle loss, gallstones, nutrient deficiency and rebound weight gain. The planner has capped your calorie target at a safe floor.',
          `The plan requires a daily ${isLosing ? 'deficit' : 'surplus'} of about ${Math.abs(Math.round(dailyAdjust))} kcal.`,
        ],
        advice: [
          'Split the adjustment: half from food, half from movement — adherence doubles compared to diet-only.',
          'Re-run this planner every 5 kg; TDEE falls as you lose weight.',
          isLosing
            ? 'Add 2 resistance sessions/week and 1.6–2.2 g/kg protein so the loss comes from fat, not muscle.'
            : 'For lean gain, keep the surplus ≤300–500 kcal and train progressively 3–5×/week.',
        ],
      };
    },
  },

  // ═══════════ FITNESS & HEART (5) ═══════════
  {
    id: 'max-heart-rate', name: 'Maximum Heart Rate', tagline: 'Tanaka formula — more accurate than 220−age',
    description: 'Your maximum heart rate anchors every training zone. This tool compares the classic 220−age rule with the research-backed Tanaka formula (208 − 0.7 × age) used in modern exercise physiology.',
    category: 'fitness', icon: 'Heart', keywords: ['max heart rate', 'mhr', 'tanaka', '220'],
    fields: [{ name: 'age', label: 'Age', type: 'number', unit: 'years', min: 10, max: 120, placeholder: 'e.g. 30' }],
    compute: (s) => {
      const age = num(s.age, 30);
      const tanaka = 208 - 0.7 * age;
      const classic = 220 - age;
      return {
        headline: `${Math.round(tanaka)}`,
        headlineLabel: 'Max heart rate (bpm) — Tanaka',
        category: 'Estimated maximum',
        tone: 'info',
        metrics: [
          { label: 'Classic 220 − age', value: `${Math.round(classic)} bpm`, hint: `Tanaka differs by ${Math.round(tanaka - classic)} bpm` },
          { label: 'Moderate zone (64–76%)', value: `${Math.round(tanaka * 0.64)}–${Math.round(tanaka * 0.76)} bpm`, tone: 'good' },
          { label: 'Vigorous zone (77–93%)', value: `${Math.round(tanaka * 0.77)}–${Math.round(tanaka * 0.93)} bpm`, tone: 'caution' },
          { label: 'Red-line (95%+)', value: `${Math.round(tanaka * 0.95)}+ bpm`, tone: 'danger', hint: 'Only for short intervals' },
        ],
        insights: [
          'Formulas estimate the population average — your true max can vary ±10–12 bpm. A supervised field test (all-out 800 m run) measures it directly.',
          'Max heart rate is not a fitness indicator: it declines with age regardless of training. Fitness shows in how fast your heart rate recovers after effort.',
          'Training above 90% of max for extended periods raises injury and overtraining risk for non-athletes.',
        ],
        advice: [
          'Spend ~80% of weekly training at conversational pace (60–70% max) and ~20% at vigorous intensity.',
          'Use the Target Heart Rate calculator for personalised Karvonen zones based on your resting heart rate.',
          'If you take beta-blockers, heart-rate zones do not apply — use perceived exertion instead.',
        ],
      };
    },
  },
  {
    id: 'target-heart-rate', name: 'Target Heart Rate Zones', tagline: 'Karvonen method with heart-rate reserve',
    description: 'The Karvonen formula builds training zones from your heart-rate reserve (max − resting), giving zones that respect your current fitness. Five zones from recovery to maximum effort, each with its training benefit.',
    category: 'fitness', icon: 'HeartPulse', keywords: ['target heart rate', 'karvonen', 'zones', 'thr'],
    fields: [
      { name: 'age', label: 'Age', type: 'number', unit: 'years', min: 10, max: 120, placeholder: 'e.g. 30' },
      { name: 'rhr', label: 'Resting heart rate', type: 'number', unit: 'bpm', min: 30, max: 120, placeholder: 'Measure before getting up', defaultValue: '70' },
    ],
    compute: (s) => {
      const age = num(s.age, 30);
      const rhr = num(s.rhr, 70);
      const maxHR = 208 - 0.7 * age;
      const reserve = maxHR - rhr;
      const zone = (low: number, high: number) => `${Math.round(reserve * low + rhr)}–${Math.round(reserve * high + rhr)} bpm`;
      let rhrTone: Tone = 'good';
      if (rhr > 80) rhrTone = 'warning';
      else if (rhr > 70) rhrTone = 'caution';
      return {
        headline: zone(0.5, 0.7),
        headlineLabel: 'Fat-burn / aerobic zone (50–70% HRR)',
        category: 'Karvonen method',
        tone: 'good',
        metrics: [
          { label: 'Max heart rate (Tanaka)', value: `${Math.round(maxHR)} bpm` },
          { label: 'Heart-rate reserve', value: `${Math.round(reserve)} bpm` },
          { label: 'Zone 1 · Recovery (50–60%)', value: zone(0.5, 0.6), tone: 'good', hint: 'Warm-up, easy days' },
          { label: 'Zone 2 · Aerobic (60–70%)', value: zone(0.6, 0.7), tone: 'good', hint: 'Fat burning, endurance base' },
          { label: 'Zone 3 · Tempo (70–80%)', value: zone(0.7, 0.8), tone: 'caution', hint: 'Aerobic capacity' },
          { label: 'Zone 4 · Threshold (80–90%)', value: zone(0.8, 0.9), tone: 'warning', hint: 'Speed endurance' },
          { label: 'Zone 5 · Max (90–100%)', value: zone(0.9, 1), tone: 'danger', hint: 'Short intervals only' },
          {
            label: 'Your resting HR',
            value: `${rhr} bpm`,
            tone: rhrTone,
            hint: rhr <= 60 ? 'Athletic range' : rhr <= 70 ? 'Healthy' : rhr <= 80 ? 'Slightly elevated' : 'Elevated — worth checking',
          },
        ],
        insights: [
          `Your heart-rate reserve is ${Math.round(reserve)} bpm — the wider this number, the fitter your cardiovascular system.`,
          rhr > 80
            ? 'A resting heart rate above 80 bpm is associated with higher cardiovascular risk in large cohort studies. Regular zone-2 cardio typically lowers it 5–15 bpm within 8–12 weeks.'
            : 'Your resting heart rate is in a healthy range — a strong independent predictor of longevity.',
          'Zone 2 training (conversational pace) builds mitochondrial density and is the foundation elite endurance athletes spend 80% of their time in.',
        ],
        advice: [
          'Aim for 150–300 min/week in zones 1–2 plus 1–2 short zone-4 interval sessions.',
          'Measure resting HR for 3 consecutive mornings and average it for accuracy.',
          'Track heart-rate recovery: dropping ≥12 bpm in the first minute after hard effort is a good sign.',
        ],
      };
    },
  },
  {
    id: 'one-rep-max', name: 'One-Rep Max (1RM)', tagline: 'Strength potential from any set you lifted',
    description: 'Estimates your one-repetition maximum from a sub-maximal set using three validated formulas (Epley, Brzycki, Lombardi) and generates your full percentage-based training load table.',
    category: 'fitness', icon: 'Dumbbell', keywords: ['1rm', 'one rep max', 'strength', 'epley', 'lifting'],
    fields: [
      { name: 'weight', label: 'Weight lifted', type: 'number', unit: 'kg', min: 1, max: 500, step: 0.5, placeholder: 'e.g. 80' },
      { name: 'reps', label: 'Repetitions performed', type: 'number', unit: 'reps', min: 1, max: 15, placeholder: 'e.g. 6' },
    ],
    compute: (s) => {
      const weight = num(s.weight, 0);
      const reps = Math.round(num(s.reps, 1));
      const epley = reps === 1 ? weight : weight * (1 + reps / 30);
      const brzycki = reps === 1 ? weight : weight * (36 / (37 - reps));
      const lombardi = reps === 1 ? weight : weight * Math.pow(reps, 0.1);
      const avg = (epley + brzycki + lombardi) / 3;
      return {
        headline: `${round(avg, 1)} kg`,
        headlineLabel: 'Estimated one-rep max (3-formula average)',
        category: `${round(kgToLb(avg))} lb · from ${reps} × ${weight} kg`,
        tone: 'info',
        metrics: [
          { label: 'Epley formula', value: `${round(epley, 1)} kg`, hint: 'Best above 5 reps' },
          { label: 'Brzycki formula', value: `${round(brzycki, 1)} kg`, hint: 'Best under 6 reps' },
          { label: 'Lombardi formula', value: `${round(lombardi, 1)} kg` },
          { label: '90% — strength (2–4 reps)', value: `${round(avg * 0.9, 1)} kg`, tone: 'danger' },
          { label: '80% — power (5–8 reps)', value: `${round(avg * 0.8, 1)} kg`, tone: 'warning' },
          { label: '70% — hypertrophy (8–12 reps)', value: `${round(avg * 0.7, 1)} kg`, tone: 'good' },
          { label: '60% — endurance (15+ reps)', value: `${round(avg * 0.6, 1)} kg`, tone: 'good' },
        ],
        insights: [
          'Estimates are most reliable for sets of 1–10 reps; beyond that, fatigue mechanics skew the formulas.',
          `Your training sweet spots: ${round(avg * 0.7, 1)}–${round(avg * 0.8, 1)} kg for muscle growth, ${round(avg * 0.9, 1)} kg for maximal strength work.`,
          'True 1RM attempts stress joints and the nervous system — test at most every 8–12 weeks, and always with a spotter.',
        ],
        advice: [
          'Hypertrophy: 3–5 sets of 8–12 reps at ~70–75% of 1RM, 2 reps shy of failure.',
          'Strength: 3–6 sets of 2–6 reps at ~80–90% with 3–5 min rest.',
          'Re-run this calculator as your working sets get stronger to keep percentages current.',
        ],
      };
    },
  },
  {
    id: 'calorie-burn', name: 'Calorie Burn (Activity)', tagline: 'MET-based energy expenditure for 18 activities',
    description: 'Estimates calories burned using the Compendium of Physical Activities MET values: kcal = MET × 3.5 × body weight (kg) ÷ 200 × minutes. Choose from 18 common activities.',
    category: 'fitness', icon: 'Footprints', keywords: ['calorie burn', 'met', 'exercise calories', 'running', 'walking'],
    fields: [
      { name: 'activity', label: 'Activity', type: 'select', defaultValue: '4.3', options: activityOptions },
      { name: 'minutes', label: 'Duration', type: 'number', unit: 'minutes', min: 1, max: 600, placeholder: 'e.g. 45' },
      { name: 'kg', label: 'Your weight', type: 'number', unit: 'kg', min: 20, max: 300, step: 0.1, placeholder: 'e.g. 72' },
    ],
    compute: (s) => {
      const met = num(s.activity, 4.3);
      const minutes = num(s.minutes, 30);
      const kg = num(s.kg, 70);
      const kcal = met * 3.5 * kg / 200 * minutes;
      const perHour = kcal / minutes * 60;
      return {
        headline: `${Math.round(kcal)}`,
        headlineLabel: `Calories burned (kcal) — ${minutes} min`,
        category: 'MET-based estimate',
        tone: 'good',
        metrics: [
          { label: 'Burn rate', value: `${Math.round(perHour)} kcal/hour`, hint: `MET ${met}` },
          { label: 'Per minute', value: `${round(kcal / minutes, 1)} kcal/min` },
          { label: 'Fat equivalent', value: `${round(kcal / 7700, 3)} kg`, hint: 'Body fat this session offsets' },
          { label: 'Weekly impact (5×/week)', value: `${Math.round(kcal * 5)} kcal/week`, tone: 'good' },
        ],
        insights: [
          `This session burns ~${Math.round(kcal)} kcal. Combined with a 300 kcal dietary deficit, five sessions weekly would produce roughly ${round((kcal * 5 + 300 * 7) / 7700, 2)} kg of fat loss per week.`,
          'Heavier bodies burn more per minute at the same pace — your burn falls as you lose weight, so adjust intake targets over time.',
          met >= 6
            ? 'Vigorous-intensity activity (MET ≥ 6) counts double toward the WHO 150-minute weekly guideline.'
            : 'Moderate-intensity activity counts 1:1 toward the WHO 150-minute weekly guideline.',
        ],
        advice: [
          'Stack activity: 300 kcal of exercise ≈ 300 kcal of food — moving is often easier than resisting.',
          'Mix intensities: 80% moderate sessions + 20% vigorous for the best health-to-time ratio.',
          'Track total weekly burn, not single sessions — consistency compounds.',
        ],
      };
    },
  },
  {
    id: 'steps-calories', name: 'Steps → Distance & Calories', tagline: 'Turn daily steps into real numbers',
    description: 'Converts step counts into distance and calories burned using your stride length (estimated from height when not measured) and body weight.',
    category: 'fitness', icon: 'Move', keywords: ['steps', 'walking distance', '10000 steps', 'stride'],
    fields: [
      { name: 'steps', label: 'Number of steps', type: 'number', unit: 'steps', min: 100, max: 200000, placeholder: 'e.g. 10000' },
      { name: 'kg', label: 'Your weight', type: 'number', unit: 'kg', min: 20, max: 300, step: 0.1, placeholder: 'e.g. 72' },
      { name: 'height', label: 'Your height', type: 'number', unit: 'cm', min: 100, max: 230, step: 0.5, placeholder: 'e.g. 172' },
      { name: 'stride', label: 'Stride length (optional)', type: 'number', unit: 'cm', min: 40, max: 150, step: 0.5, placeholder: 'Leave blank to auto-estimate' },
    ],
    compute: (s) => {
      const steps = num(s.steps, 10000);
      const kg = num(s.kg, 70);
      const heightCm = num(s.height, 170);
      const strideCm = s.stride ? num(s.stride, 0) : heightCm * 0.415;
      const distanceKm = steps * strideCm / 100 / 1000;
      const kcal = 0.53 * kg * distanceKm;
      const walkingMinutes = Math.round(steps / 100);
      return {
        headline: `${round(distanceKm, 2)} km`,
        headlineLabel: `Distance covered (${steps.toLocaleString()} steps)`,
        category: `Stride ${round(strideCm)} cm`,
        tone: 'good',
        metrics: [
          { label: 'Calories burned', value: `${Math.round(kcal)} kcal`, tone: 'good', hint: 'At your body weight' },
          { label: 'Miles', value: `${round(distanceKm * 0.621371, 2)} mi` },
          { label: 'Estimated walking time', value: `~${Math.floor(walkingMinutes / 60)}h ${walkingMinutes % 60}m`, hint: '≈100 steps/min' },
          {
            label: 'vs 10,000-step goal',
            value: steps >= 10000 ? 'Goal reached ✓' : `${Math.round(steps / 10000 * 100)}% of goal`,
            tone: steps >= 10000 ? 'good' : 'caution',
          },
        ],
        insights: [
          `${steps.toLocaleString()} steps ≈ ${round(distanceKm, 1)} km and ~${Math.round(kcal)} kcal — roughly ${round(kcal / 7700 * 1000, 1)} g of body fat.`,
          'A 2022 Lancet meta-analysis found mortality risk keeps falling up to ~10,000 steps/day (7,000 for older adults); the "10k" number is a good target, not a magic threshold.',
          'Walking after meals blunts post-meal blood-glucose spikes by up to 30% — the same steps do more good when timed well.',
        ],
        advice: [
          'Three 10-minute post-meal walks beat one 30-minute walk for glucose control.',
          'Add 1,000 steps/week progressively if you are currently sedentary.',
          'Measure your real stride once (walk 20 steps, measure, divide by 20) for exact distances.',
        ],
      };
    },
  },

  // ═══════════ NUTRITION (3) ═══════════
  {
    id: 'macros', name: 'Macronutrient Planner', tagline: 'Protein / carbs / fat grams for your goal & diet style',
    description: 'Turns your calorie target into exact daily grams of protein, carbohydrates and fat for four popular diet styles — balanced, low-carb, ketogenic and high-protein — with AI guidance on food sources.',
    category: 'nutrition', icon: 'Salad', keywords: ['macros', 'protein carbs fat', 'keto', 'diet plan', 'macronutrients'],
    fields: [
      unitsField, sexField, ageField, weightKgField, weightLbField, heightCmField, heightFtField, heightInField,
      { name: 'activity', label: 'Activity level', type: 'select', defaultValue: '1.55', options: activityLevelOptions },
      {
        name: 'goal', label: 'Goal', type: 'select', defaultValue: '-500',
        options: [
          { value: '-500', label: 'Fat loss (−500 kcal)' },
          { value: '-250', label: 'Slow fat loss (−250 kcal)' },
          { value: '0', label: 'Maintenance' },
          { value: '+300', label: 'Lean muscle gain (+300 kcal)' },
        ],
      },
      { name: 'style', label: 'Diet style', type: 'select', defaultValue: 'balanced', options: dietStyleOptions },
    ],
    compute: (s) => {
      const kg = toKg(s.units, s.kg, s.lb);
      const cm = toCm(s.units, s.cm, s.ft, s.inch);
      const age = num(s.age, 30);
      const isMale = s.sex !== 'female';
      const tdee = mifflinBMR(kg, cm, age, isMale) * num(s.activity, 1.55);
      const goalAdj = num(s.goal, -500);
      const calorieTarget = Math.max(isMale ? 1500 : 1200, tdee + goalAdj);
      const style = dietStyleRatios[s.style] || dietStyleRatios.balanced;
      const proteinG = calorieTarget * style.protein / 4;
      const carbsG = calorieTarget * style.carbs / 4;
      const fatG = calorieTarget * style.fat / 9;
      const proteinPerKg = proteinG / kg;
      return {
        headline: `${Math.round(proteinG)}P · ${Math.round(carbsG)}C · ${Math.round(fatG)}F`,
        headlineLabel: `Daily macros (g) — ${Math.round(calorieTarget)} kcal`,
        category: s.style === 'balanced' ? 'Balanced' : s.style === 'lowcarb' ? 'Low-carb' : s.style === 'keto' ? 'Ketogenic' : 'High-protein',
        tone: 'info',
        metrics: [
          { label: 'Protein', value: `${Math.round(proteinG)} g`, tone: 'good', hint: `${round(proteinPerKg, 1)} g/kg · ${Math.round(calorieTarget * style.protein)} kcal` },
          { label: 'Carbohydrates', value: `${Math.round(carbsG)} g`, hint: `${Math.round(calorieTarget * style.carbs)} kcal` },
          { label: 'Fat', value: `${Math.round(fatG)} g`, hint: `${Math.round(calorieTarget * style.fat)} kcal` },
          { label: 'Maintenance (TDEE)', value: `${Math.round(tdee)} kcal` },
          { label: 'Per meal (3 meals)', value: `${Math.round(proteinG / 3)}P / ${Math.round(carbsG / 3)}C / ${Math.round(fatG / 3)}F g`, hint: 'Even distribution maximises protein synthesis' },
        ],
        insights: [
          `Your plan targets ${Math.round(calorieTarget)} kcal/day with ${Math.round(proteinG)} g protein (${round(proteinPerKg, 1)} g/kg).`,
          proteinPerKg < 1.2
            ? '⚠ Protein below 1.2 g/kg is low if you train or are in a deficit — muscle loss risk rises. Consider the high-protein style.'
            : 'Protein at this level protects lean mass in a deficit and maximises muscle protein synthesis — research supports 1.6–2.2 g/kg for trainees.',
          s.style === 'keto'
            ? 'Ketogenic diets can be effective short-term for fat loss and glycaemic control, but they restrict fruit, legumes and whole grains — monitor fibre and electrolytes, and consult a doctor if diabetic or on medication.'
            : 'This split is sustainable for most people and compatible with a varied whole-food diet.',
        ],
        advice: [
          'Protein first: eggs, chicken, fish, lentils (daal), Greek yogurt, paneer, tofu, whey.',
          'Prefer slow carbs — oats, brown rice, whole wheat roti, sweet potato — over refined flour and sugar.',
          'Get fats mostly from olive oil, nuts, seeds, avocado and fatty fish rather than fried foods.',
        ],
      };
    },
  },
  {
    id: 'water-intake', name: 'Daily Water Intake', tagline: 'Personalised hydration target',
    description: 'Computes your daily fluid requirement from body weight, exercise and climate, based on guidelines from the Institute of Medicine and sports-medicine hydration research.',
    category: 'nutrition', icon: 'Droplets', keywords: ['water', 'hydration', 'fluid', 'pani'],
    fields: [
      { name: 'kg', label: 'Body weight', type: 'number', unit: 'kg', min: 15, max: 300, step: 0.1, placeholder: 'e.g. 72' },
      { name: 'exercise', label: 'Daily exercise', type: 'number', unit: 'minutes', min: 0, max: 300, defaultValue: '0', placeholder: 'e.g. 45' },
      {
        name: 'climate', label: 'Climate', type: 'select', defaultValue: 'temperate',
        options: [
          { value: 'temperate', label: 'Temperate / AC most of the day' },
          { value: 'hot', label: 'Hot & humid (e.g. Pakistan summer)' },
          { value: 'dry', label: 'Hot & dry / arid' },
          { value: 'highalt', label: 'High altitude (>2,500 m)' },
        ],
      },
      {
        name: 'pregnant', label: 'Pregnant or breastfeeding?', type: 'select', defaultValue: 'no',
        options: [
          { value: 'no', label: 'No' },
          { value: 'pregnant', label: 'Pregnant (+300 ml)' },
          { value: 'breastfeeding', label: 'Breastfeeding (+700 ml)' },
        ],
      },
    ],
    compute: (s) => {
      const kg = num(s.kg, 70);
      const exerciseMin = num(s.exercise, 0);
      let totalMl = kg * 35;
      totalMl += exerciseMin / 30 * 350;
      totalMl += { temperate: 0, hot: 500, dry: 400, highalt: 400 }[s.climate] ?? 0;
      if (s.pregnant === 'pregnant') totalMl += 300;
      if (s.pregnant === 'breastfeeding') totalMl += 700;
      const litres = totalMl / 1000;
      const glasses = Math.round(totalMl / 250);
      return {
        headline: `${round(litres, 1)} L`,
        headlineLabel: 'Daily fluid target',
        category: `${glasses} glasses (250 ml each)`,
        tone: 'good',
        metrics: [
          { label: 'Millilitres', value: `${Math.round(totalMl)} ml` },
          { label: 'Baseline (35 ml/kg)', value: `${round(kg * 35 / 1000, 1)} L` },
          { label: 'Exercise addition', value: exerciseMin > 0 ? `+${Math.round(exerciseMin / 30 * 350)} ml` : '—' },
          { label: 'Hourly reminder pace', value: `${round(litres / 16, 2)} L/hour`, hint: 'Over a 16-hour day' },
        ],
        insights: [
          'About 20% of fluid intake typically comes from food (fruit, vegetables, soups, daal) — beverages need to cover the rest.',
          'Even 2% dehydration impairs concentration, mood and physical performance; thirst arrives late, so sip on a schedule.',
          'The clearest hydration check: pale-straw coloured urine 4–7×/day. Dark urine = drink now; completely clear all day = possibly over-drinking.',
        ],
        advice: [
          'Anchor habits: 1 glass on waking, 1 before each meal, 1 per prayer/work break.',
          'In hot weather add electrolytes (a pinch of salt + lemon) if sweating heavily for >1 hour.',
          'Tea and coffee count toward intake, but cap caffeine at ~400 mg/day and rehydrate after each cup.',
        ],
      };
    },
  },
  {
    id: 'protein-intake', name: 'Protein Requirement', tagline: 'Evidence-based grams per day for your lifestyle',
    description: 'Protein needs vary enormously between a sedentary adult, an endurance athlete and someone cutting fat while lifting. This tool applies ISSN and WHO position-stand ranges to your exact situation.',
    category: 'nutrition', icon: 'Beef', keywords: ['protein', 'grams', 'muscle', 'whey', 'diet'],
    fields: [
      { name: 'kg', label: 'Body weight', type: 'number', unit: 'kg', min: 15, max: 300, step: 0.1, placeholder: 'e.g. 72' },
      {
        name: 'lifestyle', label: 'Lifestyle & goal', type: 'select', defaultValue: 'active',
        options: [
          { value: 'sedentary', label: 'Sedentary — little exercise (RDA 0.8–1.0 g/kg)' },
          { value: 'active', label: 'Recreationally active (1.2–1.6 g/kg)' },
          { value: 'endurance', label: 'Endurance athlete — running/cycling (1.4–1.8 g/kg)' },
          { value: 'strength', label: 'Strength / muscle building (1.6–2.2 g/kg)' },
          { value: 'cutting', label: 'Fat loss while training (1.8–2.4 g/kg)' },
          { value: 'senior', label: 'Older adult 65+ — prevent sarcopenia (1.2–1.5 g/kg)' },
        ],
      },
      {
        name: 'meals', label: 'Meals per day', type: 'select', defaultValue: '3',
        options: [
          { value: '2', label: '2 meals' },
          { value: '3', label: '3 meals' },
          { value: '4', label: '4 meals' },
          { value: '5', label: '5 meals' },
        ],
      },
    ],
    compute: (s) => {
      const kg = num(s.kg, 70);
      const ranges: Record<string, [number, number]> = {
        sedentary: [0.8, 1.0], active: [1.2, 1.6], endurance: [1.4, 1.8],
        strength: [1.6, 2.2], cutting: [1.8, 2.4], senior: [1.2, 1.5],
      };
      const [low, high] = ranges[s.lifestyle] || ranges.active;
      const mid = (low + high) / 2;
      const meals = num(s.meals, 3);
      const perMeal = mid * kg / meals;
      return {
        headline: `${Math.round(low * kg)}–${Math.round(high * kg)} g`,
        headlineLabel: 'Protein target per day',
        category: `${round(low, 1)}–${round(high, 1)} g/kg body weight`,
        tone: 'good',
        metrics: [
          { label: 'Optimal midpoint', value: `${Math.round(mid * kg)} g/day`, tone: 'good' },
          { label: 'Per meal', value: `${Math.round(perMeal)} g × ${meals} meals`, hint: '≥25–30 g/meal maximises muscle protein synthesis' },
          { label: 'Calories from protein', value: `${Math.round(mid * kg * 4)} kcal` },
          { label: 'Food equivalents (midpoint)', value: `≈ ${Math.round(mid * kg / 31)} chicken breasts or ${Math.round(mid * kg / 8)} eggs`, hint: '31 g / 6–8 g protein each' },
        ],
        insights: [
          'The RDA of 0.8 g/kg is a minimum to prevent deficiency — not an optimum. Every major sports-nutrition body recommends more for active people.',
          'Protein is the most satiating macronutrient (highest thermic effect, ~25% of its calories burned in digestion) — the single biggest dietary lever for fat loss.',
          perMeal < 25
            ? '⚠ Your per-meal amount is under the ~25–30 g leucine threshold that maximally triggers muscle protein synthesis. Fewer, larger protein meals work better than tiny amounts spread thin.'
            : 'Your per-meal distribution clears the ~25–30 g threshold for maximal muscle protein synthesis.',
        ],
        advice: [
          'Anchor each meal around a palm-sized protein source before adding carbs.',
          'Budget-friendly complete proteins: eggs, lentils + rice, chickpeas, yogurt, milk, chicken thighs, canned fish.',
          'Whey or plant protein powder is a convenience, not a necessity — whole foods first.',
        ],
      };
    },
  },

  // ═══════════ MEDICAL SCREENERS (6) ═══════════
  {
    id: 'blood-pressure', name: 'Blood Pressure Checker', tagline: 'ACC/AHA 2017 category & risk guidance',
    description: 'Classifies your systolic/diastolic reading against the American College of Cardiology / American Heart Association 2017 guideline — the standard used worldwide — and explains what your numbers mean.',
    category: 'medical', icon: 'Gauge', keywords: ['blood pressure', 'bp', 'hypertension', 'systolic', 'diastolic', 'pressure'],
    fields: [
      { name: 'systolic', label: 'Systolic (top number)', type: 'number', unit: 'mmHg', min: 60, max: 260, placeholder: 'e.g. 120' },
      { name: 'diastolic', label: 'Diastolic (bottom number)', type: 'number', unit: 'mmHg', min: 35, max: 160, placeholder: 'e.g. 80' },
      { name: 'pulse', label: 'Pulse (optional)', type: 'number', unit: 'bpm', min: 30, max: 220, placeholder: 'e.g. 72' },
    ],
    compute: (s) => {
      const sys = num(s.systolic, 120);
      const dia = num(s.diastolic, 80);
      const pulse = num(s.pulse, 0);
      let category: string, tone: Tone, score: number, guidance: string;
      if (sys < 90 || dia < 60) {
        category = 'Low (hypotension)'; tone = 'caution'; score = 60;
        guidance = 'If you feel dizzy or faint, see a doctor — otherwise low-normal readings are often benign.';
      } else if (sys < 120 && dia < 80) {
        category = 'Normal'; tone = 'good'; score = 96;
        guidance = 'Excellent. Keep it up with regular activity, low salt and healthy weight.';
      } else if (sys < 130 && dia < 80) {
        category = 'Elevated'; tone = 'caution'; score = 72;
        guidance = 'Lifestyle therapy now prevents progression: weight, salt, alcohol and exercise changes.';
      } else if (sys >= 180 || dia >= 120) {
        category = 'Hypertensive crisis'; tone = 'danger'; score = 10;
        guidance = '⚠ Seek emergency care now, especially with chest pain, breathlessness, weakness or vision change.';
      } else if (sys < 140 || dia < 90) {
        category = 'High BP — Stage 1'; tone = 'warning'; score = 48;
        guidance = 'Lifestyle changes are indicated; medication may be added if your 10-year cardiac risk is ≥10%.';
      } else {
        category = 'High BP — Stage 2'; tone = 'danger'; score = 28;
        guidance = 'See a doctor — stage 2 hypertension usually requires medication alongside lifestyle change.';
      }
      const pulsePressure = sys - dia;
      return {
        headline: `${sys}/${dia}`,
        headlineLabel: 'Your reading (mmHg)',
        category,
        tone,
        score: Math.round(score),
        gauge: {
          min: 80, max: 200, value: clamp(sys, 80, 200), unit: 'systolic',
          bands: [
            { from: 80, to: 120, label: 'Normal', tone: 'good' },
            { from: 120, to: 130, label: 'Elevated', tone: 'caution' },
            { from: 130, to: 140, label: 'Stage 1', tone: 'warning' },
            { from: 140, to: 180, label: 'Stage 2', tone: 'danger' },
            { from: 180, to: 200, label: 'Crisis', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Guideline', value: 'ACC/AHA 2017' },
          {
            label: 'Pulse pressure',
            value: `${pulsePressure} mmHg`,
            tone: pulsePressure > 60 ? 'caution' : 'good',
            hint: pulsePressure > 60 ? 'Widened — arterial stiffness marker' : 'Normal (40–60)',
          },
          ...(pulse > 0
            ? [{
              label: 'Pulse',
              value: `${pulse} bpm`,
              tone: (pulse >= 60 && pulse <= 100 ? 'good' : 'caution') as Tone,
              hint: 'Normal resting: 60–100',
            }]
            : []),
          { label: 'Target if treated', value: '< 130/80 mmHg', hint: 'For most adults' },
        ],
        insights: [
          guidance,
          'Blood pressure is the leading modifiable risk factor for stroke worldwide. Every 10 mmHg systolic reduction cuts major cardiovascular events by ~20%.',
          'Single readings mislead — white-coat effect can add 5–15 mmHg. Diagnose only from averages of multiple readings on multiple days.',
        ],
        advice: [
          'Measure correctly: 5 min seated rest, back supported, feet flat, cuff at heart level, no talking.',
          'Take 2 readings morning and evening for 7 days and average them.',
          'Biggest levers: −1 kg body weight ≈ −1 mmHg; DASH diet ≈ −8 to −14 mmHg; salt <5 g/day ≈ −5 to −6 mmHg.',
        ],
      };
    },
  },
  {
    id: 'cholesterol-ratio', name: 'Cholesterol Ratio Analyzer', tagline: 'TC/HDL, LDL/HDL and non-HDL risk markers',
    description: 'Interprets a standard lipid panel: total cholesterol, HDL, LDL and triglycerides. Computes the ratios cardiologists use to stratify heart-disease risk beyond raw numbers.',
    category: 'medical', icon: 'TestTubes', keywords: ['cholesterol', 'lipid', 'hdl', 'ldl', 'triglycerides', 'ratio'],
    fields: [
      {
        name: 'unit', label: 'Units', type: 'select', defaultValue: 'mgdl',
        options: [
          { value: 'mgdl', label: 'mg/dL (US, Pakistan, India)' },
          { value: 'mmol', label: 'mmol/L (UK, Canada, EU)' },
        ],
      },
      { name: 'total', label: 'Total cholesterol', type: 'number', min: 1, max: 500, step: 0.1, placeholder: 'mg/dL: e.g. 190' },
      { name: 'hdl', label: 'HDL ("good") cholesterol', type: 'number', min: 0.1, max: 200, step: 0.1, placeholder: 'mg/dL: e.g. 50' },
      { name: 'ldl', label: 'LDL ("bad") cholesterol', type: 'number', min: 0.1, max: 400, step: 0.1, placeholder: 'mg/dL: e.g. 115' },
      { name: 'trig', label: 'Triglycerides', type: 'number', min: 0.1, max: 2000, step: 0.1, placeholder: 'mg/dL: e.g. 140' },
    ],
    compute: (s) => {
      const isMmol = s.unit === 'mmol';
      const conv = (v: number) => isMmol ? v * 38.67 : v;
      const total = conv(num(s.total, 0));
      const hdl = conv(num(s.hdl, 0));
      const ldl = conv(num(s.ldl, 0));
      const trig = conv(num(s.trig, 0));
      const tcHdlRatio = total / hdl;
      const ldlHdlRatio = ldl / hdl;
      const nonHdl = total - hdl;
      const trigHdlRatio = trig / hdl;
      let tone: Tone, score: number;
      if (tcHdlRatio > 5.5 || ldl > 159 || trig > 199 || hdl < 40) {
        tone = 'danger'; score = 35;
      } else if (tcHdlRatio > 5 || ldl > 129 || trig > 149) {
        tone = 'warning'; score = 58;
      } else if (tcHdlRatio > 4.4 || ldl > 99 || trig > 99) {
        tone = 'caution'; score = 74;
      } else {
        tone = 'good'; score = 90;
      }
      const fmt = (v: number) => isMmol ? `${round(v / 38.67, 2)} mmol/L` : `${Math.round(v)} mg/dL`;
      return {
        headline: round(tcHdlRatio, 2).toFixed(2),
        headlineLabel: 'Total/HDL cholesterol ratio',
        category: tcHdlRatio < 3.5 ? 'Ideal — below average risk' : tcHdlRatio < 5 ? 'Moderate risk' : 'High risk',
        tone,
        score: Math.round(score),
        gauge: {
          min: 2, max: 8, value: clamp(tcHdlRatio, 2, 8),
          bands: [
            { from: 2, to: 3.5, label: 'Ideal', tone: 'good' },
            { from: 3.5, to: 5, label: 'Moderate', tone: 'caution' },
            { from: 5, to: 8, label: 'High', tone: 'danger' },
          ],
        },
        metrics: [
          {
            label: 'LDL/HDL ratio',
            value: round(ldlHdlRatio, 2).toFixed(2),
            tone: ldlHdlRatio < 2.5 ? 'good' : ldlHdlRatio < 3.3 ? 'caution' : 'danger',
            hint: 'Ideal < 2.5',
          },
          {
            label: 'Non-HDL cholesterol',
            value: fmt(nonHdl),
            tone: nonHdl < 130 ? 'good' : 'caution',
            hint: 'Target < 130 mg/dL',
          },
          {
            label: 'Triglyceride/HDL ratio',
            value: round(trigHdlRatio, 2).toFixed(2),
            tone: trigHdlRatio < 2 ? 'good' : trigHdlRatio < 3.5 ? 'caution' : 'danger',
            hint: 'Insulin-resistance marker; ideal < 2',
          },
          {
            label: 'HDL status',
            value: fmt(hdl),
            tone: hdl >= 60 ? 'good' : hdl >= 40 ? 'caution' : 'danger',
            hint: 'Protective if ≥ 60 mg/dL',
          },
        ],
        insights: [
          'Ratios beat raw numbers: a TC/HDL ratio under 3.5 marks roughly half the heart-attack risk of a ratio above 5.',
          trigHdlRatio >= 3.5
            ? '⚠ A high triglyceride/HDL ratio is a recognised surrogate for insulin resistance and small-dense LDL — the atherogenic pattern. It often improves dramatically with sugar/alcohol reduction and weight loss.'
            : 'Your triglyceride/HDL ratio suggests good insulin sensitivity.',
          hdl < 40
            ? 'Low HDL (<40 mg/dL) removes a protective factor. Exercise, olive oil, nuts and fatty fish raise it; smoking suppresses it.'
            : 'HDL is at a protective level — keep the aerobic activity coming.',
        ],
        advice: [
          'Cut trans fats completely (vanaspati, repeatedly fried food) and limit saturated fat to <10% of calories.',
          '25–40 g soluble fibre daily (oats, beans, psyllium) lowers LDL by 5–10%.',
          'If LDL stays above target despite 3–6 months of lifestyle change, discuss statins with your doctor — they remain the most evidence-backed therapy.',
        ],
      };
    },
  },
  {
    id: 'egfr', name: 'Kidney Function (eGFR)', tagline: 'CKD-EPI 2021 — the current global standard',
    description: 'Estimates glomerular filtration rate from serum creatinine using the race-free CKD-EPI 2021 equation adopted by the NKF and ASN, and stages chronic kidney disease per KDIGO guidelines.',
    category: 'medical', icon: 'Bean', keywords: ['egfr', 'kidney', 'creatinine', 'renal', 'gfr', 'gurde'],
    fields: [
      { name: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120, placeholder: 'e.g. 45' },
      sexField,
      {
        name: 'creatUnit', label: 'Creatinine units', type: 'select', defaultValue: 'mgdl',
        options: [
          { value: 'mgdl', label: 'mg/dL' },
          { value: 'umol', label: 'µmol/L' },
        ],
      },
      { name: 'creat', label: 'Serum creatinine', type: 'number', min: 0.1, max: 2000, step: 0.01, placeholder: 'mg/dL: e.g. 0.95' },
    ],
    compute: (s) => {
      const age = num(s.age, 45);
      const isFemale = s.sex === 'female';
      const creatRaw = num(s.creat, 1.0);
      const creatMgdl = s.creatUnit === 'umol' ? creatRaw / 88.4 : creatRaw;
      const kappa = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.241 : -0.302;
      const safeCreat = Math.max(0.1, creatMgdl);
      const egfrVal = 142
        * Math.pow(Math.min(safeCreat / kappa, 1), alpha)
        * Math.pow(Math.max(safeCreat / kappa, 1), -1.2)
        * Math.pow(0.9938, age)
        * (isFemale ? 1.012 : 1);
      const egfr = (isNaN(egfrVal) || !isFinite(egfrVal)) ? 90 : egfrVal;
      let stage: string, tone: Tone, score: number;
      if (egfr >= 90) { stage = 'G1 — Normal / high'; tone = 'good'; score = 95; }
      else if (egfr >= 60) { stage = 'G2 — Mildly decreased'; tone = 'caution'; score = 78; }
      else if (egfr >= 45) { stage = 'G3a — Mild–moderate CKD'; tone = 'warning'; score = 55; }
      else if (egfr >= 30) { stage = 'G3b — Moderate–severe CKD'; tone = 'warning'; score = 40; }
      else if (egfr >= 15) { stage = 'G4 — Severely decreased'; tone = 'danger'; score = 22; }
      else { stage = 'G5 — Kidney failure'; tone = 'danger'; score = 10; }
      return {
        headline: `${Math.round(egfr)}`,
        headlineLabel: 'eGFR (mL/min/1.73 m²)',
        category: stage,
        tone,
        score: Math.round(score),
        gauge: {
          min: 0, max: 120, value: clamp(egfr, 0, 120),
          bands: [
            { from: 0, to: 15, label: 'G5', tone: 'danger' },
            { from: 15, to: 30, label: 'G4', tone: 'danger' },
            { from: 30, to: 45, label: 'G3b', tone: 'warning' },
            { from: 45, to: 60, label: 'G3a', tone: 'warning' },
            { from: 60, to: 90, label: 'G2', tone: 'caution' },
            { from: 90, to: 120, label: 'G1', tone: 'good' },
          ],
        },
        metrics: [
          { label: 'Equation', value: 'CKD-EPI 2021 (race-free)' },
          { label: 'Serum creatinine', value: `${round(creatMgdl, 2)} mg/dL` },
          { label: 'CKD threshold', value: 'eGFR < 60 for 3+ months' },
          {
            label: 'Age-related note',
            value: egfr >= 90 && age > 65 ? 'Normal decline with age' : '—',
            hint: 'eGFR falls ~0.8/yr after 40',
          },
        ],
        insights: [
          egfr >= 60
            ? 'An eGFR of 60+ indicates adequate kidney filtration. Note that G1–G2 stages only count as CKD when paired with markers of kidney damage (e.g. albumin in urine).'
            : 'An eGFR below 60 sustained for 3+ months defines chronic kidney disease. Early stages are often silent — testing is the only way to catch them.',
          'Creatinine comes from muscle, so very muscular people can show a "low" eGFR with healthy kidneys, and elderly people with low muscle mass can show a falsely normal one.',
          'The two biggest protectors of kidney function: controlled blood pressure (<130/80) and controlled blood sugar.',
        ],
        advice: [
          'Avoid chronic NSAID painkiller use (ibuprofen, diclofenac) — a leading drug-related cause of kidney injury.',
          'Stay hydrated, keep salt moderate, and get a urine albumin/creatinine ratio test if eGFR < 60 or you have diabetes/hypertension.',
          egfr < 60
            ? 'See a nephrologist — modern drugs (SGLT2 inhibitors, ACE inhibitors) slow CKD progression substantially.'
            : 'Recheck annually; every 6–12 months if you have diabetes or hypertension.',
        ],
      };
    },
  },
  {
    id: 'creatinine-clearance', name: 'Creatinine Clearance', tagline: 'Cockcroft-Gault — drug dosing standard',
    description: 'Cockcroft-Gault creatinine clearance remains the reference for dosing renally-cleared medications (antibiotics, anticoagulants, metformin). Includes ideal-body-weight variant used in clinical pharmacy.',
    category: 'medical', icon: 'FlaskConical', keywords: ['creatinine clearance', 'cockcroft', 'drug dosing', 'renal function'],
    fields: [
      { name: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120, placeholder: 'e.g. 60' },
      sexField,
      { name: 'kg', label: 'Body weight', type: 'number', unit: 'kg', min: 20, max: 300, step: 0.1, placeholder: 'e.g. 75' },
      { name: 'cm', label: 'Height', type: 'number', unit: 'cm', min: 100, max: 230, step: 0.5, placeholder: 'e.g. 170' },
      { name: 'creat', label: 'Serum creatinine', type: 'number', unit: 'mg/dL', min: 0.1, max: 30, step: 0.01, placeholder: 'e.g. 1.1' },
    ],
    compute: (s) => {
      const age = num(s.age, 60);
      const kg = num(s.kg, 70);
      const cm = num(s.cm, 170);
      const isFemale = s.sex === 'female';
      const creat = num(s.creat, 1);
      const crCl = (140 - age) * kg / (72 * creat) * (isFemale ? 0.85 : 1);
      const inchesOver5Ft = Math.max(0, cm / 2.54 - 60);
      const ibw = (isFemale ? 45.5 : 50) + 2.3 * inchesOver5Ft;
      const crClIbw = (140 - age) * ibw / (72 * creat) * (isFemale ? 0.85 : 1);
      return {
        headline: `${Math.round(crCl)}`,
        headlineLabel: 'Creatinine clearance (mL/min)',
        category: crCl >= 90 ? 'Normal' : crCl >= 60 ? 'Mild impairment' : crCl >= 30 ? 'Moderate impairment' : 'Severe impairment',
        tone: crCl >= 90 ? 'good' : crCl >= 60 ? 'caution' : crCl >= 30 ? 'warning' : 'danger',
        score: Math.round(clamp(crCl, 5, 100)),
        metrics: [
          { label: 'Using ideal body weight', value: `${Math.round(crClIbw)} mL/min`, hint: `IBW ${round(ibw, 1)} kg — preferred in obesity` },
          { label: 'Ideal body weight (Devine)', value: `${round(ibw, 1)} kg` },
          {
            label: 'Metformin caution',
            value: crCl >= 45 ? 'Generally OK' : crCl >= 30 ? 'Dose review needed' : 'Contraindicated',
            tone: crCl >= 45 ? 'good' : crCl >= 30 ? 'caution' : 'danger',
          },
          {
            label: 'Dose adjustment band',
            value: crCl >= 60 ? 'No adjustment (most drugs)' : crCl >= 30 ? 'Many drugs need adjustment' : 'Significant adjustment required',
            tone: crCl >= 60 ? 'good' : 'warning',
          },
        ],
        insights: [
          'Cockcroft-Gault (1976) is still embedded in most drug labels — pharmacists use it, not eGFR, for dosing decisions.',
          kg > ibw * 1.2
            ? 'Your actual weight exceeds ideal weight by >20%, which inflates the standard result. Clinicians would use the ideal- or adjusted-body-weight value shown above.'
            : 'Actual and ideal body weight are close, so both estimates agree well.',
          'Clearance declines ~1 mL/min/year after age 40 — dose reviews matter more with every decade.',
        ],
        advice: [
          'Share this number with any prescriber before starting renally-cleared drugs (e.g. DOACs, aminoglycosides, metformin).',
          'Stay well hydrated before blood draws — dehydration transiently raises creatinine.',
          'Never adjust prescription doses yourself; use this to have an informed conversation with your clinician.',
        ],
      };
    },
  },
  {
    id: 'heart-risk', name: 'Heart Disease Risk', tagline: 'Simplified 10-year cardiovascular risk estimate',
    description: 'A Framingham-style point-score screening that estimates your 10-year risk of a cardiovascular event from age, sex, blood pressure, cholesterol, smoking and diabetes status. Educational screening only — not a diagnosis.',
    category: 'medical', icon: 'HeartCrack', keywords: ['heart risk', 'cardiovascular', 'framingham', 'heart attack risk', 'cardiac'],
    fields: [
      sexField,
      { name: 'age', label: 'Age', type: 'number', unit: 'years', min: 30, max: 90, placeholder: 'e.g. 50' },
      {
        name: 'smoker', label: 'Smoker?', type: 'select', defaultValue: 'no',
        options: [
          { value: 'no', label: 'Non-smoker' },
          { value: 'yes', label: 'Current smoker' },
        ],
      },
      {
        name: 'diabetes', label: 'Diabetes?', type: 'select', defaultValue: 'no',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes (type 1 or 2)' },
        ],
      },
      { name: 'sys', label: 'Systolic BP', type: 'number', unit: 'mmHg', min: 80, max: 220, placeholder: 'e.g. 128', defaultValue: '120' },
      { name: 'total', label: 'Total cholesterol', type: 'number', unit: 'mg/dL', min: 100, max: 400, placeholder: 'e.g. 200', defaultValue: '200' },
      { name: 'hdl', label: 'HDL cholesterol', type: 'number', unit: 'mg/dL', min: 20, max: 120, placeholder: 'e.g. 50', defaultValue: '50' },
    ],
    compute: (s) => {
      const isMale = s.sex !== 'female';
      const age = clamp(num(s.age, 50), 30, 79);
      const sys = num(s.sys, 120);
      const total = num(s.total, 200);
      const hdl = num(s.hdl, 50);
      const smoker = s.smoker === 'yes';
      const diabetic = s.diabetes === 'yes';
      let points = 0;
      points += Math.round(isMale ? (age - 30) * 0.28 : (age - 30) * 0.18);
      if (sys >= 160) points += isMale ? 3 : 4;
      else if (sys >= 140) points += isMale ? 2 : 3;
      else if (sys >= 130) points += 1;
      if (total >= 280) points += 3;
      else if (total >= 240) points += 2;
      else if (total >= 200) points += 1;
      if (hdl >= 60) points -= 1;
      else if (hdl < 40) points += 2;
      else if (hdl < 50) points += 1;
      if (smoker) points += isMale ? (age < 50 ? 4 : 3) : (age < 50 ? 5 : 4);
      if (diabetic) points += isMale ? (age < 50 ? 4 : 3) : (age < 50 ? 6 : 4);
      const riskPct = clamp(100 / (1 + Math.exp(-(points - 12) * 0.45)), 0.5, 40);
      let tone: Tone, label: string, score: number;
      if (riskPct < 5) { tone = 'good'; label = 'Low risk'; score = 92; }
      else if (riskPct < 10) { tone = 'caution'; label = 'Borderline risk'; score = 68; }
      else if (riskPct < 20) { tone = 'warning'; label = 'Intermediate risk'; score = 45; }
      else { tone = 'danger'; label = 'High risk'; score = 22; }
      return {
        headline: `${round(riskPct, 1)}%`,
        headlineLabel: 'Estimated 10-year CVD event risk',
        category: label,
        tone,
        score: Math.round(score),
        gauge: {
          min: 0, max: 30, value: clamp(riskPct, 0, 30),
          bands: [
            { from: 0, to: 5, label: 'Low', tone: 'good' },
            { from: 5, to: 10, label: 'Borderline', tone: 'caution' },
            { from: 10, to: 20, label: 'Intermediate', tone: 'warning' },
            { from: 20, to: 30, label: 'High', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Risk points', value: `${points} pts`, hint: '≥12 ≈ intermediate/high' },
          {
            label: 'Biggest driver',
            value: smoker ? 'Smoking' : diabetic ? 'Diabetes' : age > 60 ? 'Age' : sys >= 140 ? 'Blood pressure' : total >= 240 ? 'Cholesterol' : 'Age profile',
            tone: smoker || diabetic ? 'danger' : 'info',
          },
          { label: 'Guideline threshold', value: '≥10% → consider statin', hint: 'ACC/AHA — discuss with doctor' },
        ],
        insights: [
          'This is a simplified educational screening model. For clinical decisions, doctors use the full ACC/AHA ASCVD Pooled Cohort Equations with your exact labs.',
          smoker
            ? 'Smoking is your single largest modifiable risk factor — quitting at any age recovers roughly half the excess cardiac risk within 1–2 years.'
            : 'Not smoking is already protecting you substantially.',
          diabetic
            ? 'Diabetes roughly doubles cardiovascular risk, but modern control (A1C <7%, BP <130/80, statin, SGLT2/GLP-1 where indicated) removes much of that excess.'
            : 'Absence of diabetes keeps your baseline risk lower.',
          'Age is the strongest non-modifiable factor — which makes controlling the modifiable ones (BP, lipids, smoking, glucose) increasingly valuable every year.',
        ],
        advice: [
          riskPct >= 10
            ? 'Book a full ASCVD assessment with your doctor — you may benefit from statin therapy.'
            : 'Keep risk low: BP <120/80, LDL <100, no smoking, 150 min/week activity.',
          'Mediterranean-style diet reduces cardiovascular events by ~30% in high-risk adults (PREDIMED trial).',
          'Re-run this yearly, and after any change in BP, lipids or smoking status.',
        ],
      };
    },
  },
  {
    id: 'diabetes-risk', name: 'Type 2 Diabetes Risk', tagline: 'FINDRISC — the WHO-recommended screening score',
    description: 'Implements the Finnish Diabetes Risk Score (FINDRISC), validated internationally and recommended by WHO/IDF for type 2 diabetes screening. Estimates your 10-year risk from eight simple questions.',
    category: 'medical', icon: 'TriangleAlert', keywords: ['diabetes risk', 'findrisc', 'type 2', 'sugar risk', 'shoogar'],
    fields: [
      {
        name: 'age', label: 'Age', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'Under 45' },
          { value: '2', label: '45–54' },
          { value: '3', label: '55–64' },
          { value: '4', label: 'Over 64' },
        ],
      },
      {
        name: 'bmi', label: 'BMI', type: 'select', defaultValue: '1',
        options: [
          { value: '0', label: '< 25 kg/m²' },
          { value: '1', label: '25–30 kg/m²' },
          { value: '3', label: '> 30 kg/m²' },
        ],
      },
      {
        name: 'waist', label: 'Waist circumference', type: 'select', defaultValue: '3',
        options: [
          { value: '0', label: 'Men <94 cm · Women <80 cm' },
          { value: '3', label: 'Men 94–102 cm · Women 80–88 cm' },
          { value: '4', label: 'Men >102 cm · Women >88 cm' },
        ],
      },
      {
        name: 'exercise', label: '≥30 min physical activity daily?', type: 'select', defaultValue: '2',
        options: [
          { value: '0', label: 'Yes' },
          { value: '2', label: 'No' },
        ],
      },
      {
        name: 'veg', label: 'Vegetables/fruit daily?', type: 'select', defaultValue: '1',
        options: [
          { value: '0', label: 'Every day' },
          { value: '1', label: 'Not every day' },
        ],
      },
      {
        name: 'bpmed', label: 'Ever on blood-pressure medication?', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'No' },
          { value: '2', label: 'Yes' },
        ],
      },
      {
        name: 'highglucose', label: 'Ever told you have high blood glucose?', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'No' },
          { value: '5', label: 'Yes' },
        ],
      },
      {
        name: 'family', label: 'Family history of diabetes', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'None' },
          { value: '3', label: '2nd degree (grandparent, uncle, cousin)' },
          { value: '5', label: '1st degree (parent, sibling, child)' },
        ],
      },
    ],
    compute: (s) => {
      const score = ['age', 'bmi', 'waist', 'exercise', 'veg', 'bpmed', 'highglucose', 'family']
        .reduce((sum, key) => sum + num(s[key], 0), 0);
      let label: string, tone: Tone, probability: string, healthScore: number;
      if (score <= 6) { label = 'Low'; tone = 'good'; probability = '~1% (very unlikely)'; healthScore = 92; }
      else if (score <= 11) { label = 'Slightly elevated'; tone = 'caution'; probability = '~4%'; healthScore = 72; }
      else if (score <= 14) { label = 'Moderate'; tone = 'warning'; probability = '~17%'; healthScore = 50; }
      else if (score <= 20) { label = 'High'; tone = 'warning'; probability = '~33%'; healthScore = 32; }
      else { label = 'Very high'; tone = 'danger'; probability = '~50%'; healthScore = 15; }
      return {
        headline: `${score}`,
        headlineLabel: 'FINDRISC score (0–26)',
        category: `${label} risk — 10-year chance: ${probability}`,
        tone,
        score: Math.round(healthScore),
        gauge: {
          min: 0, max: 26, value: clamp(score, 0, 26),
          bands: [
            { from: 0, to: 7, label: 'Low', tone: 'good' },
            { from: 7, to: 12, label: 'Slight', tone: 'caution' },
            { from: 12, to: 15, label: 'Moderate', tone: 'warning' },
            { from: 15, to: 21, label: 'High', tone: 'warning' },
            { from: 21, to: 26, label: 'Very high', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Risk band', value: label, tone },
          { label: '10-year probability', value: probability },
          {
            label: 'Biggest contributors',
            value: [
              num(s.highglucose, 0) === 5 ? 'Prior high glucose (+5)' : '',
              num(s.family, 0) >= 3 ? 'Family history' : '',
              num(s.waist, 0) >= 3 ? 'Central waist' : '',
              num(s.bmi, 0) >= 3 ? 'BMI > 30' : '',
            ].filter(Boolean).join(', ') || 'None major',
            tone: score >= 12 ? 'warning' : 'info',
          },
        ],
        insights: [
          'FINDRISC was validated on 15,000+ people and is used in national diabetes-prevention programmes across Europe and Asia.',
          score >= 12
            ? 'Your score warrants an actual blood test (fasting glucose or HbA1c) — screening tools estimate risk, only labs confirm it.'
            : 'Your 10-year risk is low, but roughly half of type 2 diabetes is preventable through weight, diet and activity — worth protecting.',
          'The Diabetes Prevention Program showed lifestyle intervention (7% weight loss + 150 min/week activity) beats metformin at preventing progression from prediabetes.',
        ],
        advice: [
          score >= 12
            ? 'Get fasting glucose / HbA1c tested within the next month.'
            : 'Screen every 1–3 years, or yearly if you have a first-degree relative with diabetes.',
          'Lose 5–7% of body weight if overweight — the single most effective prevention step.',
          'Replace sugary drinks with water; liquid sugar is the strongest dietary diabetes driver.',
        ],
      };
    },
  },

  // ═══════════ WELLNESS & HABITS (4) ═══════════
  {
    id: 'sleep-cycle', name: 'Sleep Cycle Planner', tagline: 'Wake up at the end of a cycle, not mid-deep-sleep',
    description: 'Sleep proceeds in ~90-minute cycles. Waking at a cycle boundary leaves you refreshed; waking mid-cycle causes grogginess (sleep inertia). Plan your bedtime or alarm around complete cycles, including the ~15 minutes it takes to fall asleep.',
    category: 'wellness', icon: 'Moon', keywords: ['sleep', 'sleep cycle', 'bedtime', 'alarm', 'neend'],
    fields: [
      {
        name: 'mode', label: 'I want to plan', type: 'select', defaultValue: 'wake',
        options: [
          { value: 'wake', label: 'Best bedtimes for a fixed wake-up time' },
          { value: 'bed', label: 'Best wake-up times for a fixed bedtime' },
        ],
      },
      { name: 'hour', label: 'Hour (24h clock)', type: 'number', min: 0, max: 23, placeholder: 'e.g. 6', defaultValue: '6' },
      { name: 'minute', label: 'Minute', type: 'number', min: 0, max: 59, placeholder: 'e.g. 30', defaultValue: '30' },
    ],
    compute: (s) => {
      const base = new Date();
      base.setHours(num(s.hour, 6), num(s.minute, 30), 0, 0);
      const fallAsleepMin = 15;
      const cycleMin = 90;
      const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const options: { label: string; value: string; tone: Tone; hint: string }[] = [];
      for (let cycles = 6; cycles >= 3; cycles--) {
        const totalMin = cycles * cycleMin + fallAsleepMin;
        const target = new Date(base.getTime() + (s.mode === 'wake' ? -totalMin * 60000 : totalMin * 60000));
        const hours = cycles * cycleMin / 60;
        options.push({
          label: s.mode === 'wake'
            ? `Bedtime for ${cycles} cycles (${round(hours, 1)} h sleep)`
            : `Wake up after ${cycles} cycles (${round(hours, 1)} h sleep)`,
          value: fmtTime(target),
          tone: cycles >= 5 ? 'good' : cycles === 4 ? 'caution' : 'warning',
          hint: cycles >= 5 ? 'Recommended' : cycles === 4 ? 'Acceptable' : 'Minimum — occasional only',
        });
      }
      return {
        headline: options[1]?.value || '—',
        headlineLabel: s.mode === 'wake' ? 'Ideal bedtime (5 cycles · 7.5 h)' : 'Ideal alarm (5 cycles · 7.5 h)',
        category: `Fixed time: ${fmtTime(base)}`,
        tone: 'good',
        metrics: options,
        insights: [
          'Adults need 7–9 hours (5–6 cycles). The 7.5-hour option is the sweet spot for most people.',
          'Deep sleep concentrates in the first half of the night and REM in the second — cutting the last cycle costs you mostly REM (memory & mood), cutting early sleep costs deep repair.',
          'Consistent sleep/wake times matter as much as duration: irregular schedules raise metabolic and cardiovascular risk independently.',
        ],
        advice: [
          'Keep the same wake-up time every day, even weekends — it anchors your circadian rhythm.',
          'No screens, caffeine (after 2 pm) or heavy meals within 2–3 hours of bedtime.',
          'Morning sunlight within 30 minutes of waking dramatically improves night-time sleep quality.',
        ],
      };
    },
  },
  {
    id: 'quit-smoking', name: 'Quit Smoking Tracker', tagline: 'Money saved + hour-by-hour health recovery timeline',
    description: 'Shows exactly what quitting smoking returns to you: the money you keep, and the medically documented recovery timeline — from 20 minutes after the last cigarette to 20 years later.',
    category: 'wellness', icon: 'CigaretteOff', keywords: ['smoking', 'quit', 'cigarette', 'tobacco', 'tamaku'],
    fields: [
      { name: 'perDay', label: 'Cigarettes per day', type: 'number', unit: 'cigs', min: 1, max: 80, placeholder: 'e.g. 12' },
      { name: 'packPrice', label: 'Price per pack', type: 'number', unit: 'currency', min: 1, max: 1000, step: 1, placeholder: 'e.g. 350' },
      { name: 'perPack', label: 'Cigarettes per pack', type: 'number', min: 10, max: 40, defaultValue: '20' },
      { name: 'years', label: 'Years smoked', type: 'number', unit: 'years', min: 0, max: 70, placeholder: 'e.g. 8' },
    ],
    compute: (s) => {
      const perDay = num(s.perDay, 10);
      const packPrice = num(s.packPrice, 300);
      const perPack = num(s.perPack, 20);
      const years = num(s.years, 5);
      const perCig = packPrice / perPack;
      const yearlyCost = perCig * perDay * 365;
      const fortyYearCost = yearlyCost * 40;
      const totalSpent = perCig * perDay * 365 * years;
      return {
        headline: `${Math.round(yearlyCost).toLocaleString()}`,
        headlineLabel: 'Money saved per year by quitting',
        category: `${perDay} cigarettes/day habit`,
        tone: 'good',
        metrics: [
          { label: 'Saved in 1 month', value: Math.round(yearlyCost / 12).toLocaleString(), tone: 'good' },
          { label: 'Saved in 10 years', value: Math.round(yearlyCost * 10).toLocaleString(), tone: 'good' },
          { label: 'Saved over 40 years', value: Math.round(fortyYearCost).toLocaleString(), hint: 'Ignoring price rises — real figure is higher' },
          { label: 'Already spent (≈ years smoked)', value: Math.round(totalSpent).toLocaleString(), tone: 'danger' },
          {
            label: 'Cigarettes not smoked in 1 year',
            value: Math.round(perDay * 365).toLocaleString(),
            hint: `≈ ${Math.round(perDay * 365 * years / 1000)}k so far`,
          },
          {
            label: 'Life expectancy gain (avg)',
            value: 'Up to +10 years',
            tone: 'good',
            hint: 'Quitting before 40 avoids ~90% of excess risk',
          },
        ],
        insights: [
          'Recovery timeline: 20 min → heart rate & BP drop · 12 h → blood CO normalises · 2 weeks → circulation & lung function improve · 1–9 months → coughing and breathlessness fall · 1 year → coronary heart disease risk halves · 5 years → stroke risk approaches non-smoker · 10 years → lung cancer death risk halves · 20 years → cancer risk near never-smoker.',
          'Smoking is the single largest preventable cause of death globally (~8 million/year including second-hand smoke).',
          `Your habit has cost roughly ${Math.round(totalSpent).toLocaleString()} over ${years} years — quitting today keeps ~${Math.round(yearlyCost).toLocaleString()} every future year.`,
        ],
        advice: [
          'Pick a quit date within 2 weeks and tell someone — accountability doubles success rates.',
          'Nicotine replacement (patches/gum) roughly doubles quit rates; prescription varenicline/bupropion helps further — ask a doctor.',
          'Cravings peak and pass within 3–5 minutes: delay, deep-breathe, drink water, walk.',
          'Most successful quitters needed 3–6 attempts. A relapse is data, not failure.',
        ],
      };
    },
  },
  {
    id: 'alcohol-bac', name: 'Alcohol Units & BAC', tagline: 'Standard drinks, units and estimated blood alcohol',
    description: 'Converts drinks into standard alcohol units and estimates blood alcohol concentration (BAC) with the Widmark formula — plus how long until you are back under common legal limits. Harm-reduction tool: never drink and drive.',
    category: 'wellness', icon: 'Wine', keywords: ['alcohol', 'bac', 'drinks', 'units', 'wine', 'beer'],
    fields: [
      sexField,
      { name: 'kg', label: 'Body weight', type: 'number', unit: 'kg', min: 35, max: 250, step: 0.1, placeholder: 'e.g. 75' },
      { name: 'beer', label: 'Beers (330 ml, 5%)', type: 'number', min: 0, max: 30, defaultValue: '0', placeholder: '0' },
      { name: 'wine', label: 'Wine glasses (150 ml, 12%)', type: 'number', min: 0, max: 30, defaultValue: '0', placeholder: '0' },
      { name: 'spirits', label: 'Spirits shots (45 ml, 40%)', type: 'number', min: 0, max: 30, defaultValue: '0', placeholder: '0' },
      { name: 'hours', label: 'Drinking over (hours)', type: 'number', unit: 'hours', min: 0.5, max: 12, step: 0.5, placeholder: 'e.g. 2', defaultValue: '2' },
    ],
    compute: (s) => {
      const kg = num(s.kg, 75);
      const isMale = s.sex !== 'female';
      const totalDrinks = num(s.beer, 0) + num(s.wine, 0) + num(s.spirits, 0);
      const hours = Math.max(0.5, num(s.hours, 2));
      const pureAlcoholG = num(s.beer, 0) * 13.2 + num(s.wine, 0) * 14.4 + num(s.spirits, 0) * 14.4;
      const ukUnits = pureAlcoholG / 8;
      const widmarkRatio = isMale ? 0.68 : 0.55;
      let bac = pureAlcoholG / (kg * widmarkRatio * 10) - 0.015 * hours;
      bac = Math.max(0, bac);
      const hoursToSober = pureAlcoholG / (kg * widmarkRatio * 10) / 0.015;
      let tone: Tone, label: string;
      if (totalDrinks === 0) { label = 'No alcohol consumed'; tone = 'good'; }
      else if (bac < 0.02) { label = 'Minimal effect'; tone = 'good'; }
      else if (bac < 0.05) { label = 'Mild impairment'; tone = 'caution'; }
      else if (bac < 0.08) { label = 'Impaired — over limit in many countries'; tone = 'warning'; }
      else { label = 'Significantly intoxicated'; tone = 'danger'; }
      return {
        headline: `${round(bac * 100, 1) / 100}%`,
        headlineLabel: 'Estimated BAC (blood alcohol concentration)',
        category: label,
        tone,
        gauge: {
          min: 0, max: 0.2, value: clamp(bac, 0, 0.2),
          bands: [
            { from: 0, to: 0.02, label: 'Sober-ish', tone: 'good' },
            { from: 0.02, to: 0.05, label: 'Mild', tone: 'caution' },
            { from: 0.05, to: 0.08, label: 'Impaired', tone: 'warning' },
            { from: 0.08, to: 0.2, label: 'Over limit', tone: 'danger' },
          ],
        },
        metrics: [
          { label: 'Standard drinks', value: `${round(totalDrinks, 1)}`, hint: '1 drink ≈ 14 g alcohol' },
          {
            label: 'UK units',
            value: `${round(ukUnits, 1)} units`,
            tone: ukUnits > 14 ? 'danger' : ukUnits > 6 ? 'warning' : 'good',
            hint: 'Weekly guideline ≤ 14 units',
          },
          { label: 'Pure alcohol', value: `${Math.round(pureAlcoholG)} g` },
          {
            label: 'Time to reach ~0.00%',
            value: bac > 0 ? `≈ ${round(hoursToSober, 1)} hours from first drink` : '—',
            tone: 'info',
            hint: 'Liver processes ~0.015%/hour',
          },
          {
            label: 'Legal driving limit',
            value: bac >= 0.05 ? 'EXCEEDED in most countries' : 'Below 0.05% — but impairment varies',
            tone: bac >= 0.05 ? 'danger' : 'caution',
          },
        ],
        insights: [
          'Widmark estimates vary ±20–30% by individual metabolism, food intake and genetics — never use this to decide about driving. The only safe BAC for driving is 0.00%.',
          ukUnits > 14
            ? `At ${round(ukUnits, 1)} units in one session you are far above the 14-unit weekly low-risk guideline. Binge drinking (6+ units/session) acutely raises arrhythmia and injury risk.`
            : 'Within-session totals like this still count toward the weekly 14-unit low-risk guideline.',
          'Alcohol is a group-1 carcinogen (IARC): even moderate intake raises risk of several cancers. Less is always better; none is best.',
        ],
        advice: [
          'Eat before and during drinking — food slows absorption by up to 30%.',
          'Alternate every drink with a glass of water; most "hangover" is dehydration + acetaldehyde.',
          'Never drive after any alcohol — plan transport before the first drink.',
        ],
      };
    },
  },
  {
    id: 'biological-age', name: 'Biological Age Estimator', tagline: 'How old is your body vs your birthday?',
    description: 'Estimates your biological age from lifestyle inputs — activity, sleep, diet, stress, smoking and weight status — using an evidence-weighted adjustment model. Biological age tracks healthspan better than chronological age.',
    category: 'wellness', icon: 'Timer', keywords: ['biological age', 'health span', 'aging', 'real age'],
    fields: [
      { name: 'age', label: 'Chronological age', type: 'number', unit: 'years', min: 18, max: 100, placeholder: 'e.g. 35' },
      {
        name: 'exercise', label: 'Exercise sessions per week', type: 'select', defaultValue: '2',
        options: [
          { value: '0', label: 'None' },
          { value: '1', label: '1 session' },
          { value: '2', label: '2–3 sessions' },
          { value: '4', label: '4–5 sessions' },
          { value: '6', label: '6+ sessions' },
        ],
      },
      {
        name: 'sleep', label: 'Average sleep per night', type: 'select', defaultValue: '7',
        options: [
          { value: '5', label: 'Under 6 hours' },
          { value: '6.5', label: '6–7 hours' },
          { value: '7.5', label: '7–9 hours' },
          { value: '10', label: 'Over 9 hours' },
        ],
      },
      {
        name: 'veg', label: 'Fruit & vegetable servings daily', type: 'select', defaultValue: '2',
        options: [
          { value: '0', label: 'Rarely any' },
          { value: '2', label: '1–2 servings' },
          { value: '4', label: '3–4 servings' },
          { value: '6', label: '5+ servings' },
        ],
      },
      {
        name: 'stress', label: 'Chronic stress level', type: 'select', defaultValue: '5',
        options: [
          { value: '2', label: 'Low — I cope well' },
          { value: '5', label: 'Moderate' },
          { value: '8', label: 'High — often overwhelmed' },
        ],
      },
      {
        name: 'smoke', label: 'Smoking status', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'Never / quit long ago' },
          { value: '4', label: 'Occasional / ex-smoker' },
          { value: '8', label: 'Current smoker' },
        ],
      },
      {
        name: 'bmiCat', label: 'Weight status', type: 'select', defaultValue: '0',
        options: [
          { value: '0', label: 'Normal (BMI 18.5–24.9)' },
          { value: '2', label: 'Overweight (25–29.9)' },
          { value: '5', label: 'Obese (30+)' },
          { value: '3', label: 'Underweight (<18.5)' },
        ],
      },
    ],
    compute: (s) => {
      const chronoAge = num(s.age, 35);
      const exercise = num(s.exercise, 2);
      const sleep = num(s.sleep, 7);
      const veg = num(s.veg, 2);
      const stress = num(s.stress, 5);
      const smoke = num(s.smoke, 0);
      const bmiCat = num(s.bmiCat, 0);
      let adjustment = 0;
      adjustment += exercise >= 4 ? -2.5 : exercise >= 2 ? -1 : exercise >= 1 ? 0.5 : 2;
      adjustment += sleep >= 7 && sleep <= 9 ? -1 : sleep >= 6 ? 0.5 : 1.5;
      adjustment += veg >= 5 ? -1.5 : veg >= 3 ? -0.5 : veg >= 1 ? 0.5 : 1.5;
      adjustment += stress <= 2 ? -1 : stress <= 5 ? 0 : 1.5;
      adjustment += smoke >= 8 ? 5 : smoke >= 4 ? 1.5 : 0;
      adjustment += bmiCat;
      const bioAge = clamp(chronoAge + adjustment, 16, 110);
      const diff = bioAge - chronoAge;
      const tone: Tone = diff <= -1.5 ? 'good' : diff <= 1 ? 'caution' : diff <= 4 ? 'warning' : 'danger';
      return {
        headline: `${round(bioAge, 1)} yrs`,
        headlineLabel: 'Estimated biological age',
        category: diff <= -1.5 ? 'Younger than your years 🎉' : diff <= 1 ? 'About right' : diff <= 4 ? 'Ageing faster than average' : 'Significantly accelerated ageing',
        tone,
        score: Math.round(clamp(100 - diff * 8, 10, 98)),
        metrics: [
          { label: 'Chronological age', value: `${chronoAge} years` },
          { label: 'Difference', value: `${diff >= 0 ? '+' : ''}${round(diff, 1)} years`, tone },
          {
            label: 'Biggest protector',
            value: exercise >= 4 ? 'High activity level' : veg >= 5 ? 'Plant-rich diet' : smoke === 0 ? 'Non-smoking' : sleep >= 7 && sleep <= 9 ? 'Good sleep' : '—',
            tone: 'good',
          },
          {
            label: 'Biggest accelerator',
            value: smoke >= 8 ? 'Smoking (+5 yrs)' : bmiCat >= 5 ? 'Obesity (+5 yrs)' : stress >= 8 ? 'Chronic stress (+1.5 yrs)' : exercise === 0 ? 'Physical inactivity (+2 yrs)' : 'None major',
            tone: smoke >= 8 || bmiCat >= 5 ? 'danger' : 'info',
          },
        ],
        insights: [
          'Lifestyle dominates biological ageing: the Nurses\' Health Study and Blue Zones data suggest diet, activity, sleep and smoking explain more variance in healthspan than genetics.',
          diff > 1
            ? `Your estimate runs ${round(diff, 1)} years ahead of your birthday — the accelerators above are reversible; telomere and metabolic markers improve within months of change.`
            : 'Your lifestyle inputs are protective. Maintain them — consistency beats intensity for healthy ageing.',
          'This is a screening heuristic, not a lab test. Clinical biological-age measures include DNA methylation clocks, grip strength, gait speed and VO2 max.',
        ],
        advice: [
          'Highest-yield fixes: quit smoking → 150+ min/week activity → 7–9 h sleep → 5+ plants/day.',
          'Strength-train 2×/week — muscle mass is the strongest physical predictor of healthy ageing.',
          'Re-run this after 3 months of change and watch the number move.',
        ],
      };
    },
  },

  // ═══════════ PREGNANCY & KIDS (4) ═══════════
  {
    id: 'due-date', name: 'Pregnancy Due Date', tagline: "Naegele's rule + trimester roadmap",
    description: 'Estimates the due date from the first day of the last menstrual period using Naegele\'s rule (the worldwide clinical standard), adjusted for your cycle length, and maps the full trimester timeline.',
    category: 'family', icon: 'Baby', keywords: ['due date', 'pregnancy', 'lmp', 'naegele', 'delivery', 'hamal'],
    fields: [
      { name: 'lmp', label: 'First day of last period (LMP)', type: 'date' },
      { name: 'cycle', label: 'Average cycle length', type: 'number', unit: 'days', min: 20, max: 45, defaultValue: '28', placeholder: '28' },
    ],
    compute: (s) => {
      const lmp = s.lmp ? new Date(s.lmp) : new Date();
      const cycle = num(s.cycle, 28);
      const dueDate = addDays(lmp, 280 + (cycle - 28));
      const daysDiff = Math.floor((new Date().getTime() - lmp.getTime()) / 86400000);
      const weeks = Math.floor(daysDiff / 7);
      const days = daysDiff % 7;
      const trimester = weeks < 13 ? '1st trimester' : weeks < 27 ? '2nd trimester' : '3rd trimester';
      const progressPct = clamp(daysDiff / 280 * 100, 0, 100);
      return {
        headline: formatDate(dueDate),
        headlineLabel: 'Estimated due date (40 weeks)',
        category: daysDiff >= 0 && daysDiff <= 300 && weeks <= 42
          ? `Currently: week ${weeks}+${days} · ${trimester}`
          : 'Based on LMP + cycle length',
        tone: 'info',
        metrics: [
          { label: 'Progress', value: `${round(progressPct, 0)}% of 280 days`, tone: 'good' },
          ...(daysDiff >= 0 && daysDiff <= 300
            ? [{
              label: 'Days remaining',
              value: `${Math.max(0, 280 - daysDiff)} days`,
              hint: `≈ ${Math.max(0, Math.round((280 - daysDiff) / 7))} weeks`,
            }]
            : []),
          { label: '1st trimester ends', value: formatDate(addDays(lmp, 91)) },
          { label: '2nd trimester ends', value: formatDate(addDays(lmp, 189)) },
          {
            label: 'Full-term window',
            value: `${formatDate(addDays(dueDate, -14))} – ${formatDate(addDays(dueDate, 14))}`,
            hint: '37–42 weeks is normal',
          },
          {
            label: 'Conception (est.)',
            value: formatDate(addDays(lmp, cycle - 14 + 7)),
            hint: '≈ ovulation + 1 day',
          },
        ],
        insights: [
          'Only ~4–5% of babies arrive exactly on the estimated due date; the 37–42 week window is considered full-term and normal.',
          "Naegele's rule assumes a 28-day cycle with ovulation on day 14 — the cycle-length adjustment above corrects for longer or shorter cycles.",
          'An early ultrasound (8–13 weeks) dating scan is more accurate than LMP dating and will supersede this estimate if dates differ.',
        ],
        advice: [
          'Start prenatal care early: folic acid 400–800 µg/day ideally begins before conception.',
          'Key scans: dating scan 8–13 wks · anomaly scan 18–22 wks · growth scans in the 3rd trimester.',
          'Avoid smoking, alcohol and unpasteurised food; limit caffeine to 200 mg/day (~2 cups of tea/coffee).',
        ],
      };
    },
  },
  {
    id: 'ovulation', name: 'Ovulation & Fertile Window', tagline: 'Next 3 cycles of fertile days',
    description: 'Predicts ovulation and the 6-day fertile window for your next three cycles. Ovulation occurs ~14 days before the next period regardless of cycle length; the fertile window covers the 5 days before ovulation plus the day of.',
    category: 'family', icon: 'CalendarHeart', keywords: ['ovulation', 'fertile', 'conception', 'cycle', 'window'],
    fields: [
      { name: 'lmp', label: 'First day of last period', type: 'date' },
      { name: 'cycle', label: 'Average cycle length', type: 'number', unit: 'days', min: 20, max: 45, defaultValue: '28' },
      {
        name: 'luteal', label: 'Luteal phase length', type: 'number', unit: 'days', min: 10, max: 16,
        defaultValue: '14', help: 'Days from ovulation to next period (14 typical)',
      },
    ],
    compute: (s) => {
      const lmp = s.lmp ? new Date(s.lmp) : new Date();
      const cycle = num(s.cycle, 28);
      const luteal = num(s.luteal, 14);
      const now = new Date();
      let ovulationDate = addDays(lmp, cycle - luteal);
      let cyclesPassed = 0;
      while (addDays(ovulationDate, 1).getTime() < now.getTime() && cyclesPassed < 400) {
        ovulationDate = addDays(ovulationDate, cycle);
        cyclesPassed++;
      }
      const fertileStart = addDays(ovulationDate, -5);
      const fertileEnd = addDays(ovulationDate, 1);
      const daysUntil = Math.round((ovulationDate.getTime() - now.getTime()) / 86400000);
      const inWindow = now >= fertileStart && now <= fertileEnd;
      const futureCycles = [0, 1, 2].map((i) => {
        const cycleOvulation = addDays(ovulationDate, i * cycle);
        return {
          label: `Cycle ${i + 1} — fertile window`,
          value: `${formatDate(addDays(cycleOvulation, -5))} → ${formatDate(addDays(cycleOvulation, 1))}`,
          hint: `Ovulation ≈ ${formatDate(cycleOvulation)}`,
          tone: 'good' as Tone,
        };
      });
      return {
        headline: formatDate(ovulationDate),
        headlineLabel: 'Estimated ovulation day (this cycle)',
        category: daysUntil >= 0
          ? `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
          : inWindow
            ? 'Fertile window open now'
            : `${-daysUntil} days ago`,
        tone: inWindow ? 'good' : 'info',
        metrics: [
          {
            label: 'Fertile window',
            value: `${formatDate(fertileStart)} – ${formatDate(fertileEnd)}`,
            tone: 'good',
            hint: 'Highest conception chance',
          },
          {
            label: 'Peak fertility',
            value: formatDate(addDays(ovulationDate, -1)),
            hint: 'Day before ovulation',
          },
          {
            label: 'Next period expected',
            value: formatDate(addDays(lmp, cycle)),
          },
          ...futureCycles,
        ],
        insights: [
          'Sperm survive up to 5 days inside the reproductive tract, but the egg only 12–24 hours — which is why the fertile window starts before ovulation.',
          'Cycle-day predictions assume regularity; stress, illness and travel can shift ovulation by several days. LH urine test strips detect the surge 24–36 h before ovulation and are far more precise.',
          inWindow
            ? 'You appear to be inside the fertile window right now — every 1–2 days maximises conception odds.'
            : 'Conception odds per cycle are ~20–25% for healthy couples under 35; most conceive within 12 months of regular trying.',
        ],
        advice: [
          'Track signs: fertile (egg-white) cervical mucus, mild one-sided twinge, basal body temperature rise after ovulation.',
          'Start folic acid 400 µg/day now if pregnancy is possible — it prevents neural tube defects in the first weeks.',
          'See a fertility specialist after 12 months of trying (6 months if age 35+).',
        ],
      };
    },
  },
  {
    id: 'pregnancy-weight', name: 'Pregnancy Weight Gain', tagline: 'IOM/NAM guidelines for your pre-pregnancy BMI',
    description: 'Institute of Medicine (NAM) guidelines define healthy total and weekly weight gain by pre-pregnancy BMI. Too little gain risks low birth weight; too much raises gestational diabetes and delivery complications.',
    category: 'family', icon: 'Weight', keywords: ['pregnancy weight', 'gestational', 'weight gain', 'iom'],
    fields: [
      unitsField,
      { name: 'preKg', label: 'Pre-pregnancy weight', type: 'number', unit: 'kg', min: 30, max: 250, step: 0.1, placeholder: 'e.g. 60', showIf: (v) => v.units !== 'imperial' },
      { name: 'preLb', label: 'Pre-pregnancy weight', type: 'number', unit: 'lb', min: 66, max: 550, step: 0.1, placeholder: 'e.g. 132', showIf: (v) => v.units === 'imperial' },
      { name: 'cm', label: 'Height', type: 'number', unit: 'cm', min: 120, max: 210, step: 0.5, placeholder: 'e.g. 162', showIf: (v) => v.units !== 'imperial' },
      { name: 'ft', label: 'Height (feet)', type: 'number', unit: 'ft', min: 4, max: 7, placeholder: 'e.g. 5', showIf: (v) => v.units === 'imperial' },
      { name: 'inch', label: 'Height (inches)', type: 'number', unit: 'in', min: 0, max: 11.9, placeholder: 'e.g. 4', showIf: (v) => v.units === 'imperial' },
      { name: 'week', label: 'Current week of pregnancy', type: 'number', unit: 'weeks', min: 1, max: 42, placeholder: 'e.g. 20' },
      { name: 'nowKg', label: 'Current weight', type: 'number', unit: 'kg', min: 30, max: 280, step: 0.1, placeholder: 'e.g. 65', showIf: (v) => v.units !== 'imperial' },
      { name: 'nowLb', label: 'Current weight', type: 'number', unit: 'lb', min: 66, max: 620, step: 0.1, placeholder: 'e.g. 143', showIf: (v) => v.units === 'imperial' },
      {
        name: 'twins', label: 'Expecting twins?', type: 'select', defaultValue: 'no',
        options: [
          { value: 'no', label: 'Single baby' },
          { value: 'yes', label: 'Twins' },
        ],
      },
    ],
    compute: (s) => {
      const preKg = toKg(s.units, s.preKg, s.preLb);
      const heightCm = toCm(s.units, s.cm, s.ft, s.inch);
      const nowKg = toKg(s.units, s.nowKg, s.nowLb);
      const week = clamp(num(s.week, 20), 1, 42);
      const isTwins = s.twins === 'yes';
      const heightM = heightCm / 100;
      const preBMI = preKg / (heightM * heightM);
      const gained = nowKg - preKg;
      let totalRange: [number, number];
      let weeklyRange: [number, number];
      let bmiLabel: string;
      if (preBMI < 18.5) {
        totalRange = [12.5, 18]; weeklyRange = [0.44, 0.58]; bmiLabel = 'Underweight';
      } else if (preBMI < 25) {
        totalRange = [11.5, 16]; weeklyRange = [0.35, 0.5]; bmiLabel = 'Normal weight';
      } else if (preBMI < 30) {
        totalRange = [7, 11.5]; weeklyRange = [0.23, 0.33]; bmiLabel = 'Overweight';
      } else {
        totalRange = [5, 9]; weeklyRange = [0.17, 0.27]; bmiLabel = 'Obese';
      }
      if (isTwins) {
        totalRange = preBMI < 18.5
          ? [totalRange[0], totalRange[1]]
          : preBMI < 25 ? [17, 25] : preBMI < 30 ? [14, 23] : [11, 19];
        weeklyRange = [0.55, 0.75];
      }
      const expectedLow = week <= 13 ? 0.5 : 1.5 + weeklyRange[0] * (week - 13);
      const expectedHigh = week <= 13 ? 2.5 : 2.5 + weeklyRange[1] * (week - 13);
      let tone: Tone, paceLabel: string;
      if (gained < expectedLow - 1) {
        tone = 'caution'; paceLabel = 'Below recommended pace';
      } else if (gained > expectedHigh + 1) {
        tone = 'warning'; paceLabel = 'Above recommended pace';
      } else {
        tone = 'good'; paceLabel = 'On track';
      }
      const imperial = s.units === 'imperial';
      const fmt = (kg: number) => imperial ? `${round(kg * 2.2046, 1)} lb` : `${round(kg, 1)} kg`;
      return {
        headline: `${fmt(totalRange[0])} – ${fmt(totalRange[1])}`,
        headlineLabel: 'Recommended total gain (IOM/NAM)',
        category: `Pre-pregnancy BMI ${round(preBMI, 1)} · ${bmiLabel}${isTwins ? ' · twins' : ''}`,
        tone,
        metrics: [
          { label: 'Gained so far', value: fmt(gained), tone },
          {
            label: `Expected by week ${week}`,
            value: `${fmt(Math.max(0, expectedLow))} – ${fmt(expectedHigh)}`,
            hint: paceLabel,
          },
          {
            label: 'Recommended weekly pace (2nd–3rd tri)',
            value: `${fmt(weeklyRange[0])}–${fmt(weeklyRange[1])} /week`,
            tone: 'good',
          },
          {
            label: 'Remaining to midpoint',
            value: fmt(Math.max(0, (totalRange[0] + totalRange[1]) / 2 - gained)),
            hint: 'To total-range midpoint',
          },
        ],
        insights: [
          paceLabel === 'On track'
            ? 'Your gain is following the IOM trajectory for your pre-pregnancy BMI — this range optimises birth weight and lowers complication risk.'
            : paceLabel === 'Below recommended pace'
              ? 'Gaining below the recommended range raises the risk of low birth weight and preterm delivery. Never diet during pregnancy — discuss appetite with your midwife/doctor.'
              : 'Gaining above the range raises the risk of gestational diabetes, high birth weight and caesarean delivery. Focus on nutrient quality and gentle activity — not weight loss.',
          'Typical distribution: baby ~3.5 kg, placenta 0.7 kg, amniotic fluid 0.9 kg, blood & fluids 2.7 kg, breasts 0.9 kg, uterus 1.1 kg, maternal stores 3–4 kg.',
          'First-trimester gain is normally small (0.5–2 kg total); most gain happens in the 2nd and 3rd trimesters.',
        ],
        advice: [
          'Eat ~340 extra kcal/day in the 2nd trimester and ~450 in the 3rd — "eating for two" is a myth.',
          '150 min/week of moderate activity (walking, swimming, prenatal yoga) is safe and recommended for uncomplicated pregnancies.',
          'Weigh weekly at home; bring the trend — not single readings — to prenatal visits.',
        ],
      };
    },
  },
  {
    id: 'child-bmi', name: 'Child BMI Percentile', tagline: 'BMI-for-age screening (2–18 years)',
    description: 'Children are assessed with BMI-for-age percentiles, not adult BMI cutoffs. This tool compares your child against approximate CDC growth-reference thresholds for their exact age and sex.',
    category: 'family', icon: 'Ruler', keywords: ['child bmi', 'kids', 'percentile', 'growth', 'bacha'],
    fields: [
      {
        name: 'sex', label: "Child's sex", type: 'select', defaultValue: 'male',
        options: [
          { value: 'male', label: 'Boy' },
          { value: 'female', label: 'Girl' },
        ],
      },
      { name: 'age', label: 'Age', type: 'number', unit: 'years', min: 2, max: 18, step: 0.5, placeholder: 'e.g. 8.5' },
      { name: 'kg', label: 'Weight', type: 'number', unit: 'kg', min: 5, max: 150, step: 0.1, placeholder: 'e.g. 27' },
      { name: 'cm', label: 'Height', type: 'number', unit: 'cm', min: 60, max: 200, step: 0.5, placeholder: 'e.g. 130' },
    ],
    compute: (s) => {
      const isMale = s.sex !== 'female';
      const age = clamp(num(s.age, 8), 2, 18);
      const kg = num(s.kg, 25);
      const heightM = num(s.cm, 128) / 100;
      const bmi = kg / (heightM * heightM);
      const [p5, p85, p95] = childBMIRefs(age, isMale);
      let label: string, tone: Tone, score: number;
      if (bmi < p5) {
        label = 'Underweight (<5th percentile)'; tone = 'warning'; score = 55;
      } else if (bmi < p85) {
        label = 'Healthy weight (5th–85th)'; tone = 'good'; score = 95;
      } else if (bmi < p95) {
        label = 'Overweight (85th–95th)'; tone = 'caution'; score = 62;
      } else {
        label = 'Obesity (≥95th)'; tone = 'danger'; score = 35;
      }
      return {
        headline: round(bmi, 1).toFixed(1),
        headlineLabel: "Child's BMI (kg/m²)",
        category: label,
        tone,
        score: Math.round(score),
        gauge: {
          min: Math.max(10, p5 - 3), max: p95 + 5,
          value: clamp(bmi, Math.max(10, p5 - 3), p95 + 5),
          bands: [
            { from: Math.max(10, p5 - 3), to: p5, label: 'Under', tone: 'warning' },
            { from: p5, to: p85, label: 'Healthy', tone: 'good' },
            { from: p85, to: p95, label: 'Over', tone: 'caution' },
            { from: p95, to: p95 + 5, label: 'Obese', tone: 'danger' },
          ],
        },
        metrics: [
          {
            label: `Age/sex reference (${isMale ? 'boy' : 'girl'}, ${round(age, 1)} y)`,
            value: `5th: ${round(p5, 1)} · 85th: ${round(p85, 1)} · 95th: ${round(p95, 1)}`,
          },
          {
            label: 'Healthy BMI range',
            value: `${round(p5, 1)} – ${round(p85, 1)} kg/m²`,
            tone: 'good',
          },
          {
            label: 'Healthy weight range',
            value: `${round(p5 * heightM * heightM, 1)} – ${round(p85 * heightM * heightM, 1)} kg`,
          },
          {
            label: 'Position',
            value: bmi < p5
              ? `${round(p5 - bmi, 1)} below 5th %ile`
              : bmi >= p95
                ? `${round(bmi - p95, 1)} above 95th %ile`
                : 'Within healthy band',
            tone,
          },
        ],
        insights: [
          'Adult BMI cutoffs do not apply to children — a BMI of 21 is healthy for a 16-year-old girl but overweight for a 6-year-old boy. Percentile position is what matters.',
          'Childhood BMI tracks strongly into adulthood: obesity at age 10+ makes adult obesity 3–5× more likely — but growth patterns change fast, so one reading is never a verdict.',
          'These are approximate CDC reference thresholds; your paediatrician plots exact percentiles on official growth charts at every visit.',
        ],
        advice: [
          tone === 'good'
            ? 'Keep the healthy pattern: 60 min/day active play, ≤2 h recreational screen time, 5+ fruit/veg servings, 9–11 h sleep.'
            : 'Family-wide changes beat child-focused dieting: same meals for everyone, no sugary drinks at home, active outings instead of screen time.',
          'Never put a child on a restrictive diet without paediatric supervision — growth needs energy.',
          'Re-check every 3–6 months; plot the trend, not the point.',
        ],
      };
    },
  },
];

export const categories = [
  {
    id: 'body', name: 'Body Composition', description: 'BMI, body fat, weight planning and metabolic calculators',
    icon: 'Scale', gradient: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'fitness', name: 'Fitness & Heart', description: 'Heart rate zones, calorie burn and strength tools',
    icon: 'Heart', gradient: 'from-rose-500 to-orange-500',
  },
  {
    id: 'nutrition', name: 'Nutrition', description: 'Macros, hydration and protein requirement calculators',
    icon: 'Salad', gradient: 'from-lime-500 to-green-600',
  },
  {
    id: 'medical', name: 'Medical Screeners', description: 'Blood pressure, cholesterol, kidney and diabetes risk tools',
    icon: 'Gauge', gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'wellness', name: 'Wellness & Habits', description: 'Sleep, smoking, alcohol and biological age tools',
    icon: 'Moon', gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'family', name: 'Pregnancy & Kids', description: 'Due date, ovulation, pregnancy weight and child BMI',
    icon: 'Baby', gradient: 'from-pink-500 to-fuchsia-500',
  },
];

export function getCalculator(id: string): Calculator | undefined {
  return calculators.find((c) => c.id === id);
}

export function getCalculatorsByCategory(categoryId: string): Calculator[] {
  return calculators.filter((c) => c.category === categoryId);
}
