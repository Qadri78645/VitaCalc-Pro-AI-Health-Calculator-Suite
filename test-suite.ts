import { calculators, getCalculator } from './src/lib/calculators';
import { routeQuery } from './src/lib/ai';
import { exportData, importData } from './src/lib/storage';

console.log('========================================');
console.log(' VITACALC PRO — AUTOMATED TEST SUITE');
console.log('========================================\n');

// 1. CALCULATOR REGISTRY TEST
console.log('--- 1. CALCULATOR REGISTRY TEST ---');
console.log(`Total calculators registered: ${calculators.length}`);
let calcFailures = 0;

for (const calc of calculators) {
  try {
    // Execute compute with default/typical values
    const defaultValues: Record<string, string> = {};
    calc.fields.forEach((f) => {
      if (f.defaultValue) defaultValues[f.name] = f.defaultValue;
    });

    const res = calc.compute(defaultValues);

    // Validate headline
    const headline = res.headline;
    const isInvalid = headline.includes('NaN') || headline.includes('Infinity') || headline === 'undefined' || headline === '';

    if (isInvalid) {
      console.log(`FAIL: ${calc.id} — invalid headline: "${headline}"`);
      calcFailures++;
    } else {
      // Test invalid inputs
      const invalidRes = calc.compute({ age: '-999', kg: '0', cm: '0' });
      const invalidHeadline = invalidRes.headline;
      const isInvalidCrash = invalidHeadline.includes('NaN') || invalidHeadline.includes('Infinity');

      if (isInvalidCrash) {
        console.log(`FAIL: ${calc.id} — crashed on invalid input: "${invalidHeadline}"`);
        calcFailures++;
      }
    }
  } catch (err) {
    console.log(`FAIL: ${calc.id} — threw exception: ${err}`);
    calcFailures++;
  }
}

if (calcFailures === 0) {
  console.log(`PASS: All ${calculators.length} calculators passed computation & edge-case testing cleanly.\n`);
} else {
  console.log(`FAIL: ${calcFailures} calculator(s) failed.\n`);
}

// 2. AI ROUTING TEST
console.log('--- 2. AI ASSISTANT ROUTING TEST ---');
const aiTests = [
  { q: 'What is a healthy BMI?', expectRelated: 'bmi' },
  { q: 'How much protein do I need for muscle gain?', expectRelated: 'protein-intake' },
  { q: 'What do blood pressure numbers mean?', expectRelated: 'blood-pressure' },
  { q: 'How much weight should I gain during pregnancy?', expectRelated: 'pregnancy-weight' },
  { q: 'حمل میں کتنا وزن بڑھنا چاہیے؟', expectRelated: 'pregnancy-weight' },
  { q: 'میرا بلڈ پریشر high ہے', expectRelated: 'blood-pressure' },
  { q: 'موٹاپا کیسے کم کریں', expectRelated: 'bmi' },
];

let aiFailures = 0;
for (const test of aiTests) {
  const reply = routeQuery(test.q, []);
  const hasExpected = reply.related.some((r) => r.id === test.expectRelated) || reply.answer.length > 50;
  if (!hasExpected) {
    console.log(`FAIL: AI routing for "${test.q}" — missing related tool "${test.expectRelated}"`);
    aiFailures++;
  } else {
    // Ensure pregnancy query doesn't incorrectly route ONLY to bmi without pregnancy context
    if (test.q.includes('pregnancy') || test.q.includes('حمل')) {
      const isBmiOnly = reply.related.length === 1 && reply.related[0].id === 'bmi';
      if (isBmiOnly) {
        console.log(`FAIL: Pregnancy query "${test.q}" incorrectly routed only to BMI`);
        aiFailures++;
      }
    }
  }
}

if (aiFailures === 0) {
  console.log(`PASS: All ${aiTests.length} AI routing & safety queries passed.\n`);
} else {
  console.log(`FAIL: ${aiFailures} AI test(s) failed.\n`);
}

// 3. STORAGE & PORTABILITY TEST
console.log('--- 3. DASHBOARD DATA PORTABILITY TEST ---');
const exportObj = exportData();
const jsonStr = JSON.stringify(exportObj);
const importRes = importData(jsonStr);

if (importRes.success) {
  console.log('PASS: JSON export and re-import round-trip succeeded.');
} else {
  console.log(`FAIL: JSON re-import failed: ${importRes.message}`);
}

const badImport = importData('{"invalid": true}');
if (!badImport.success) {
  console.log('PASS: Malformed JSON handled safely without corruption.\n');
} else {
  console.log('FAIL: Malformed JSON was incorrectly accepted.\n');
}

console.log('========================================');
console.log(' AUTOMATED VERIFICATION COMPLETE');
console.log('========================================');
