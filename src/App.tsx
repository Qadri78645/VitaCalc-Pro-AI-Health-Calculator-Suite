import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Scale, Flame, Calculator as CalcIcon, Zap, Ruler, Target, Hourglass,
  AlignVerticalJustifyCenter, Expand, Dumbbell, Activity, CalendarCheck,
  Heart, HeartPulse, Footprints, Move, Salad, Droplets, Beef, Gauge,
  TestTubes, Bean, FlaskConical, HeartCrack, TriangleAlert, Moon,
  CigaretteOff, Wine, Timer, Baby, CalendarHeart, Weight,
  Search, Menu, X, ArrowRight, Sparkles, Shield, Lock, Globe,
  ChevronRight, BarChart3, MessageCircle, Home, LayoutGrid, Info,
  Download, Upload, Printer, Trash2, Clock, TrendingUp, AlertTriangle,
  CheckCircle2, Send, RotateCcw, Bookmark, BookmarkCheck,
  Users, HeartHandshake, Stethoscope, Leaf,
} from 'lucide-react';
import { calculators, categories, getCalculator } from './lib/calculators';
import { routeQuery, suggestedQuestions } from './lib/ai';
import {
  getRecentTools, addRecentTool, getSavedResults, saveResult,
  removeSavedResult, exportData, importData, clearSavedResults,
} from './lib/storage';
import type { CalcResult, SavedResult, ChatMessage, Tone } from './lib/types';
import { clamp } from './lib/utils';

// ─── Icon mapping ───
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Scale, Flame, Calculator: CalcIcon, Zap, Ruler, Target, Hourglass,
  AlignVerticalJustifyCenter, Expand, Dumbbell, Activity, CalendarCheck,
  Heart, HeartPulse, Footprints, Move, Salad, Droplets, Beef, Gauge,
  TestTubes, Bean, FlaskConical, HeartCrack, TriangleAlert, Moon,
  CigaretteOff, Wine, Timer, Baby, CalendarHeart, Weight,
};

function CalculatorIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Scale;
  return <Icon className={className} />;
}

// ─── Tone colors ───
const toneColors: Record<Tone, { bg: string; text: string; border: string; badge: string }> = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  caution: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' },
  info: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-800' },
};

// ─── SEO hook ───
function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', window.location.href);
  }, [title, description]);
}

// ─── Skip to content link ───
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
    >
      Skip to main content
    </a>
  );
}

// ─── Header ───
function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change (intentional: syncs UI state with navigation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional UI state sync on route change
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/calculators', label: 'All Calculators', icon: LayoutGrid },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/assistant', label: 'AI Assistant', icon: MessageCircle },
    { to: '/about', label: 'About', icon: Info },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 shadow-md backdrop-blur-lg' : 'bg-white/80 backdrop-blur-md'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-600/25">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                VitaCalc <span className="text-teal-600">Pro</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                AI Health Calculator Suite
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/calculators"
              className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:shadow-xl hover:shadow-teal-600/30 sm:flex"
            >
              <Sparkles className="h-4 w-4" />
              Start Free
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                  location.pathname === link.to
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Footer ───
function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600">
                <HeartHandshake className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="font-display text-lg font-extrabold text-slate-900">
                VitaCalc <span className="text-teal-600">Pro</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Professional AI-powered health calculator suite with clinical-standard tools.
              Free, instant, and 100% private — all computations happen on your device.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              No data ever leaves your device
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Categories</h3>
            <ul className="mt-3 space-y-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/calculators?category=${cat.id}`} className="text-sm text-slate-600 hover:text-teal-600">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Popular Tools</h3>
            <ul className="mt-3 space-y-2">
              {['bmi', 'tdee', 'blood-pressure', 'heart-risk', 'due-date', 'water-intake'].map((id) => {
                const calc = getCalculator(id);
                if (!calc) return null;
                return (
                  <li key={id}>
                    <Link to={`/calculator/${id}`} className="text-sm text-slate-600 hover:text-teal-600">
                      {calc.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Trust & Safety</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                Medical-grade formulas (WHO, ACC/AHA, ADA, IOM, KDIGO)
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                100% on-device — no tracking, no accounts
              </li>
              <li className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                Works offline after first visit (PWA)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>
                <strong className="text-slate-500">Medical Disclaimer:</strong> This tool provides health information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider with any questions about a medical condition.
              </span>
            </div>
            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} VitaCalc Pro. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Gauge component ───
function GaugeDisplay({ gauge }: { gauge: NonNullable<CalcResult['gauge']> }) {
  const pct = clamp((gauge.value - gauge.min) / (gauge.max - gauge.min), 0, 1) * 100;
  return (
    <div className="mt-4">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        {gauge.bands.map((band, i) => (
          <span key={i}>{band.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Calculator Detail Page ───
function CalculatorPage() {
  const location = useLocation();
  const calcId = location.pathname.split('/calculator/')[1] || '';
  const calculator = getCalculator(calcId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  usePageMeta(
    calculator ? `${calculator.name} — VitaCalc Pro` : 'Calculator Not Found — VitaCalc Pro',
    calculator?.description || 'The requested calculator could not be found.',
  );

  // Reset state when calculator changes (intentional: syncs form state with route param)
  useEffect(() => {
    if (calculator) {
      addRecentTool(calculator.id, calculator.name);
      const defaults: Record<string, string> = {};
      calculator.fields.forEach((f) => {
        if (f.defaultValue) defaults[f.name] = f.defaultValue;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form state reset on calculator change
      setValues(defaults);
      setResult(null);
      setErrors({});
      setSaved(false);
    }
  }, [calcId, calculator]);

  const handleFieldChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setSaved(false);
  }, []);

  const validateAndCompute = useCallback(() => {
    if (!calculator) return;
    const newErrors: Record<string, string> = {};

    calculator.fields.forEach((field) => {
      if (field.showIf && !field.showIf(values)) return;
      if (field.type === 'number') {
        const val = values[field.name];
        if (val !== undefined && val !== '') {
          const parsed = parseFloat(val);
          if (isNaN(parsed)) {
            newErrors[field.name] = 'Please enter a valid number';
          } else if (field.min !== undefined && parsed < field.min) {
            newErrors[field.name] = `Minimum value is ${field.min}`;
          } else if (field.max !== undefined && parsed > field.max) {
            newErrors[field.name] = `Maximum value is ${field.max}`;
          }
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const calcResult = calculator.compute(values);
      // Validate result has no NaN/Infinity
      const headline = calcResult.headline;
      if (headline.includes('NaN') || headline.includes('Infinity') || headline === 'undefined') {
        setResult({
          headline: '—',
          headlineLabel: 'Unable to calculate',
          category: 'Please check your inputs',
          tone: 'caution',
          metrics: [],
          insights: ['The calculation could not be completed with the provided values. Please review your inputs and try again.'],
          advice: ['Ensure all required fields are filled with reasonable values.'],
        });
        return;
      }
      setResult(calcResult);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setResult({
        headline: '—',
        headlineLabel: 'Calculation error',
        category: 'Please try again',
        tone: 'caution',
        metrics: [],
        insights: ['An unexpected error occurred during calculation. Please try again.'],
        advice: ['If the problem persists, try refreshing the page.'],
      });
    }
  }, [calculator, values]);

  const handleReset = useCallback(() => {
    if (!calculator) return;
    const defaults: Record<string, string> = {};
    calculator.fields.forEach((f) => {
      if (f.defaultValue) defaults[f.name] = f.defaultValue;
    });
    setValues(defaults);
    setResult(null);
    setErrors({});
    setSaved(false);
  }, [calculator]);

  const handleSave = useCallback(() => {
    if (!calculator || !result) return;
    const success = saveResult(calculator.id, calculator.name, result);
    setSaved(success);
  }, [calculator, result]);

  if (!calculator) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <Search className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-slate-900">Calculator Not Found</h1>
        <p className="mt-3 text-slate-500">The calculator you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/calculators"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700"
        >
          Browse All Calculators <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-teal-600">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/calculators" className="hover:text-teal-600">Calculators</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/calculators?category=${calculator.category}`} className="hover:text-teal-600">
          {categories.find((c) => c.id === calculator.category)?.name || calculator.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-900">{calculator.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
        {/* Main content */}
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-600/25">
                <CalculatorIcon name={calculator.icon} className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {calculator.name}
                </h1>
                <p className="text-sm text-slate-500">{calculator.tagline}</p>
              </div>
            </div>
            <p className="mt-4 leading-relaxed text-slate-600">{calculator.description}</p>
          </div>

          {/* Input form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900">Enter Your Details</h2>
            <p className="mt-1 text-sm text-slate-500">Fill in the fields below and click Calculate to get your personalised result.</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {calculator.fields
                .filter((field) => !field.showIf || field.showIf(values))
                .map((field) => (
                  <div key={field.name} className={field.type === 'select' ? 'sm:col-span-2' : ''}>
                    <label htmlFor={field.name} className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {field.label}
                      {field.unit && <span className="ml-1 font-normal text-slate-400">({field.unit})</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        id={field.name}
                        value={values[field.name] || field.defaultValue || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'date' ? (
                      <input
                        id={field.name}
                        type="date"
                        value={values[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    ) : (
                      <input
                        id={field.name}
                        type="number"
                        value={values[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    )}

                    {errors[field.name] && (
                      <p className="mt-1 text-xs text-rose-600">{errors[field.name]}</p>
                    )}
                    {field.help && (
                      <p className="mt-1 text-xs text-slate-400">{field.help}</p>
                    )}
                  </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={validateAndCompute}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-3 font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:shadow-xl hover:shadow-teal-600/30 active:scale-[0.98]"
              >
                <CalcIcon className="h-4.5 w-4.5" />
                Calculate
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div ref={resultRef} className="mt-8 scroll-mt-24">
              {/* Headline result */}
              <div className={`rounded-2xl border-2 p-6 ${toneColors[result.tone].border} ${toneColors[result.tone].bg}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">{result.headlineLabel}</div>
                    <div className={`mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl ${toneColors[result.tone].text}`}>
                      {result.headline}
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${toneColors[result.tone].badge}`}>
                      {result.tone === 'good' && <CheckCircle2 className="h-4 w-4" />}
                      {result.tone === 'danger' && <AlertTriangle className="h-4 w-4" />}
                      {result.tone === 'warning' && <AlertTriangle className="h-4 w-4" />}
                      {result.category}
                    </div>
                  </div>
                  {result.score !== undefined && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-500">Health Score</div>
                      <div className={`font-display text-3xl font-extrabold ${toneColors[result.tone].text}`}>
                        {result.score}
                        <span className="text-lg text-slate-400">/100</span>
                      </div>
                    </div>
                  )}
                </div>

                {result.gauge && <GaugeDisplay gauge={result.gauge} />}
              </div>

              {/* Metrics */}
              {result.metrics.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {result.metrics.map((metric, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {metric.label}
                      </div>
                      <div className={`mt-1 text-lg font-bold ${metric.tone ? toneColors[metric.tone].text : 'text-slate-900'}`}>
                        {metric.value}
                      </div>
                      {metric.hint && (
                        <div className="mt-0.5 text-xs text-slate-400">{metric.hint}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Insights */}
              {result.insights.length > 0 && (
                <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <h3 className="font-display text-lg font-bold text-violet-900">AI Insights</h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {result.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-violet-800">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advice */}
              {result.advice.length > 0 && (
                <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/50 p-6">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-teal-600" />
                    <h3 className="font-display text-lg font-bold text-teal-900">Recommended Actions</h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {result.advice.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-teal-800">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Save button */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
                    saved
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25 hover:shadow-xl'
                  }`}
                >
                  {saved ? <BookmarkCheck className="h-4.5 w-4.5" /> : <Bookmark className="h-4.5 w-4.5" />}
                  {saved ? 'Saved to Dashboard' : 'Save to Dashboard'}
                </button>
                <Link
                  to="/assistant"
                  className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-6 py-3 font-bold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  Ask AI About This
                </Link>
              </div>
            </div>
          )}

          {/* How it's calculated */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">How This Is Calculated</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
              <p>{calculator.description}</p>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Formula & Reference</div>
                <div className="mt-2 space-y-2">
                  {calculator.id === 'bmi' && (
                    <p>BMI = weight (kg) ÷ height (m)². Categories per WHO: &lt;18.5 underweight, 18.5–24.9 normal, 25–29.9 overweight, ≥30 obese.</p>
                  )}
                  {calculator.id === 'bmr' && (
                    <p>Mifflin-St Jeor: Men = 10×weight(kg) + 6.25×height(cm) − 5×age + 5; Women = 10×weight(kg) + 6.25×height(cm) − 5×age − 161.</p>
                  )}
                  {calculator.id === 'tdee' && (
                    <p>TDEE = BMR (Mifflin-St Jeor) × activity factor (1.2–1.9 based on activity level).</p>
                  )}
                  {calculator.id === 'body-fat' && (
                    <p>US Navy circumference method: Men = 495/(1.0324 − 0.19077×log10(waist−neck) + 0.15456×log10(height)) − 450.</p>
                  )}
                  {calculator.id === 'egfr' && (
                    <p>CKD-EPI 2021 (race-free): eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^(-1.2) × 0.9938^age × [1.012 if female].</p>
                  )}
                  {calculator.id === 'heart-risk' && (
                    <p>Simplified Framingham-style point score. For clinical decisions, doctors use the full ACC/AHA ASCVD Pooled Cohort Equations.</p>
                  )}
                  {calculator.id === 'blood-pressure' && (
                    <p>ACC/AHA 2017 classification: Normal &lt;120/80, Elevated 120–129/&lt;80, Stage 1 130–139 or 80–89, Stage 2 ≥140 or ≥90, Crisis ≥180/120.</p>
                  )}
                  {!['bmi', 'bmr', 'tdee', 'body-fat', 'egfr', 'heart-risk', 'blood-pressure'].includes(calculator.id) && (
                    <p>This calculator uses established medical/fitness formulas appropriate to its domain. Results are estimates based on population-level research and should be interpreted alongside professional guidance.</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  <strong>Important:</strong> This calculator provides estimates for informational and educational purposes only.
                  It is not a medical device and does not provide a diagnosis. Always consult a qualified healthcare professional
                  for medical advice, interpretation of results, and treatment decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Related calculators */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold text-slate-900">Related Calculators</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {calculators
                .filter((c) => c.category === calculator.category && c.id !== calculator.id)
                .slice(0, 3)
                .map((c) => (
                  <Link
                    key={c.id}
                    to={`/calculator/${c.id}`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <CalculatorIcon name={c.icon} className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-teal-700">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.tagline}</div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick AI chat */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                <MessageCircle className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <div className="font-bold text-violet-900">AI Health Assistant</div>
                <div className="text-xs text-violet-600">Ask anything about your results</div>
              </div>
            </div>
            <Link
              to="/assistant"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4" />
              Open AI Chat
            </Link>
          </div>

          {/* Trust badges */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-bold text-slate-900">Why Trust VitaCalc Pro?</h3>
            <ul className="mt-4 space-y-3">
              {[
                { icon: Shield, text: 'Medical-grade formulas (WHO, ACC/AHA, ADA, IOM)' },
                { icon: Lock, text: '100% on-device — your data never leaves your browser' },
                { icon: Globe, text: 'Used by health-conscious people worldwide' },
                { icon: Stethoscope, text: 'Reviewed against clinical guidelines' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span className="text-sm text-slate-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recently used */}
          <RecentToolsSidebar />
        </div>
      </div>
    </div>
  );
}

// ─── Recently Used Sidebar ───
function RecentToolsSidebar() {
  const [recent] = useState(() => getRecentTools());

  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-slate-900">
          <Clock className="h-4 w-4 text-slate-400" />
          Recently Used
        </h3>
      </div>
      <ul className="mt-4 space-y-2">
        {recent.slice(0, 5).map((tool) => (
          <li key={tool.id}>
            <Link
              to={`/calculator/${tool.id}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-teal-700"
            >
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Home Page ───
function HomePage() {
  usePageMeta(
    'VitaCalc Pro — AI Health Calculator Suite (34+ Tools)',
    'Professional AI-powered health calculator suite: BMI, calories, heart risk, diabetes, pregnancy and more. Free, instant, clinical-standard, 100% private.'
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-bold text-teal-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Health Intelligence
              </div>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your Health.
                <br />
                <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Calculated.
                </span>
                <br />
                Understood.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Professional-grade health calculators with AI insights. From BMI to heart disease risk,
                pregnancy to kidney function — get instant, accurate results based on clinical standards
                used by doctors worldwide.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/calculators"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-teal-600/25 transition-all hover:shadow-2xl hover:shadow-teal-600/30"
                >
                  <LayoutGrid className="h-5 w-5" />
                  Explore Calculators
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/assistant"
                  className="flex items-center gap-2 rounded-xl border-2 border-violet-200 bg-white px-8 py-4 text-lg font-bold text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-50"
                >
                  <MessageCircle className="h-5 w-5" />
                  Ask AI Assistant
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { num: '34+', label: 'Health Calculators' },
                  { num: '6', label: 'Medical Categories' },
                  { num: '100%', label: 'Private & Free' },
                  { num: '24/7', label: 'AI Assistant' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="font-display text-2xl font-extrabold text-slate-900">{stat.num}</div>
                    <div className="text-xs font-semibold text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto max-w-md">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Health Score</div>
                      <div className="text-xs text-slate-400">Based on your saved results</div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-end gap-3">
                    <div className="font-display text-6xl font-extrabold text-teal-600">87</div>
                    <div className="pb-2 text-lg font-bold text-slate-400">/100</div>
                    <div className="mb-2 ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Excellent
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      { label: 'BMI', value: '22.4', status: 'good', pct: 92 },
                      { label: 'Blood Pressure', value: '118/76', status: 'good', pct: 88 },
                      { label: 'Heart Risk', value: '4.2%', status: 'good', pct: 85 },
                      { label: 'Sleep Quality', value: '7.5h', status: 'caution', pct: 65 },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700">{item.label}</span>
                          <span className={`font-bold ${item.status === 'good' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {item.value}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.status === 'good' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -top-6 -right-6 rounded-2xl border border-violet-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">AI Insight</div>
                      <div className="text-[10px] text-slate-400">Personalised for you</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-6 rounded-2xl border border-teal-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">100% Private</div>
                      <div className="text-[10px] text-slate-400">On-device computation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Explore by Category
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
            From body composition to medical screening — find the right tool for your health journey.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const count = calculators.filter((c) => c.category === cat.id).length;
            return (
              <Link
                key={cat.id}
                to={`/calculators?category=${cat.id}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-300 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-lg`}>
                  <CalculatorIcon name={cat.icon} className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-slate-900 group-hover:text-teal-700">
                  {cat.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500">{cat.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">{count} calculators</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Why VitaCalc Pro?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              Built with clinical accuracy, designed for everyone.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Shield,
                title: 'Clinical Standards',
                desc: 'Formulas sourced from WHO, ACC/AHA, ADA, IOM, KDIGO and other leading medical bodies.',
                gradient: 'from-teal-500 to-emerald-600',
              },
              {
                icon: Sparkles,
                title: 'AI-Powered Insights',
                desc: 'Every result comes with personalised AI interpretation and actionable recommendations.',
                gradient: 'from-violet-500 to-purple-600',
              },
              {
                icon: Lock,
                title: '100% Private',
                desc: 'All computations happen on your device. No accounts, no tracking, no data collection.',
                gradient: 'from-sky-500 to-blue-600',
              },
              {
                icon: Globe,
                title: 'Works Everywhere',
                desc: 'Responsive design works on any device. Installable as a PWA for offline access.',
                gradient: 'from-rose-500 to-orange-500',
              },
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-12 text-center shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Ready to Take Control of Your Health?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-teal-100">
              Start with a free calculation — no sign-up required. Save your results,
              track your progress, and get AI-powered insights.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/calculators"
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-teal-700 shadow-xl transition-all hover:shadow-2xl"
              >
                <LayoutGrid className="h-5 w-5" />
                Start Calculating
              </Link>
              <Link
                to="/assistant"
                className="flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/10"
              >
                <MessageCircle className="h-5 w-5" />
                Chat with AI
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Calculators List Page ───
function CalculatorsPage() {
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const urlCategory = new URLSearchParams(location.search).get('category');
  const activeCategory = urlCategory;

  const setCategory = useCallback((cat: string | null) => {
    if (cat) {
      navigate(`/calculators?category=${cat}`);
    } else {
      navigate('/calculators');
    }
  }, [navigate]);

  usePageMeta(
    'All Health Calculators — VitaCalc Pro',
    'Browse all 34+ professional health calculators: BMI, TDEE, body fat, heart risk, diabetes, pregnancy, kidney function and more.'
  );

  const filtered = useMemo(() => {
    let result = calculators;
    if (activeCategory) {
      result = result.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return result;
  }, [search, activeCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          All Health Calculators
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Professional-grade calculators with AI insights. Choose a category or search for what you need.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto mt-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calculators... (e.g., BMI, heart, pregnancy)"
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label="Search calculators"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
            activeCategory === null
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
          }`}
        >
          All ({calculators.length})
        </button>
        {categories.map((cat) => {
          const count = calculators.filter((c) => c.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id === activeCategory ? null : cat.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((calc) => (
          <Link
            key={calc.id}
            to={`/calculator/${calc.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-300 hover:shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-600/20">
                <CalculatorIcon name={calc.icon} className="h-5 w-5 text-white" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900 group-hover:text-teal-700">
              {calc.name}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">{calc.tagline}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {categories.find((c) => c.id === calc.category)?.name || calc.category}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Search className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-slate-900">No calculators found</h2>
          <p className="mt-2 text-slate-500">Try a different search term or category.</p>
          <button
            onClick={() => {
              setSearch('');
              setCategory(null);
            }}
            className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white hover:bg-teal-700"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───
function DashboardPage() {
  const [savedResults, setSavedResults] = useState<SavedResult[]>(() => getSavedResults());
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePageMeta(
    'Health Dashboard — VitaCalc Pro',
    'Your personal health dashboard: view saved results, health score, AI report and export/import your data.'
  );

  const handleExport = useCallback(() => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vitacalc-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = importData(text);
      setImportStatus({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
      if (result.success) {
        setSavedResults(getSavedResults());
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Failed to read the file.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRemove = useCallback((calcId: string) => {
    removeSavedResult(calcId);
    setSavedResults(getSavedResults());
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all saved results? This cannot be undone.')) {
      clearSavedResults();
      setSavedResults([]);
    }
  }, []);

  // Compute aggregate health score
  const healthScore = useMemo(() => {
    const withScores = savedResults.filter((r) => r.result.score !== undefined);
    if (withScores.length === 0) return null;
    const avg = Math.round(
      withScores.reduce((sum, r) => sum + (r.result.score ?? 0), 0) / withScores.length
    );
    return avg;
  }, [savedResults]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Health Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Your personal health hub — view saved results, track progress, and get AI-powered insights.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            aria-label="Import JSON file"
          />
        </div>
      </div>

      {/* Import status */}
      {importStatus && (
        <div className={`mt-6 flex items-center gap-3 rounded-xl border p-4 ${
          importStatus.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-semibold">{importStatus.message}</p>
          <button
            onClick={() => setImportStatus(null)}
            className="ml-auto text-sm font-bold opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Health score overview */}
      {healthScore !== null && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Aggregate Health Score</h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on {savedResults.length} saved result{savedResults.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-display text-5xl font-extrabold ${
                healthScore >= 80 ? 'text-emerald-600' : healthScore >= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {healthScore}
                <span className="text-xl text-slate-400">/100</span>
              </div>
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                healthScore >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : healthScore >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
              }`}>
                {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                healthScore >= 80
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : healthScore >= 60
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-rose-400 to-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Saved results */}
      {savedResults.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-slate-900">Saved Results</h2>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedResults.map((saved) => (
              <div
                key={saved.calcId}
                className={`rounded-2xl border-2 p-5 ${toneColors[saved.result.tone].border} ${toneColors[saved.result.tone].bg}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {saved.calcName}
                    </div>
                    <div className={`mt-1 font-display text-2xl font-extrabold ${toneColors[saved.result.tone].text}`}>
                      {saved.result.headline}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{saved.result.headlineLabel}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(saved.calcId)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                    aria-label={`Remove ${saved.calcName} result`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${toneColors[saved.result.tone].badge}`}>
                  {saved.result.category}
                </div>
                <div className="mt-3 text-[10px] text-slate-400">
                  Saved {new Date(saved.savedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">No saved results yet</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            Run any calculator and press "Save to Dashboard" to build your personal health profile.
            The AI will start generating personalised insights immediately.
          </p>
          <Link
            to="/calculators"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3 font-bold text-white shadow-lg shadow-teal-600/25"
          >
            <LayoutGrid className="h-4 w-4" />
            Browse Calculators
          </Link>
        </div>
      )}

      {/* Recently used */}
      <div className="mt-12">
        <h2 className="font-display text-xl font-bold text-slate-900">Recently Used Tools</h2>
        <RecentToolsGrid />
      </div>
    </div>
  );
}

function RecentToolsGrid() {
  const [recent] = useState(() => getRecentTools());

  if (recent.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No recently used tools yet. Start using calculators and they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {recent.map((tool) => (
        <Link
          key={tool.id}
          to={`/calculator/${tool.id}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{tool.name}</div>
            <div className="text-xs text-slate-400">
              {new Date(tool.visitedAt).toLocaleDateString()}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── AI Assistant Page ───
function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: getSavedResults().length > 0
        ? `Assalam-o-Alaikum! I am your VitaCalc AI health assistant. I can see ${getSavedResults().length} saved result(s) on your dashboard and will use them to personalise my answers. Ask me anything about your health numbers, or pick a question below.`
        : 'Assalam-o-Alaikum! I am your VitaCalc AI health assistant. Ask me anything about BMI, calories, blood pressure, diabetes, sleep, pregnancy, fitness — or pick a question below. Tip: save calculator results to your dashboard and I will personalise my answers with your numbers.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  usePageMeta(
    'AI Health Assistant — VitaCalc Pro',
    'Chat with our AI health assistant: get instant answers about BMI, nutrition, heart health, pregnancy, fitness and more. Available 24/7.'
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = routeQuery(trimmed, getSavedResults());
      setMessages((prev) => [...prev, { role: 'ai', text: reply.answer, reply }]);
      setIsTyping(false);
    }, 550 + Math.random() * 500);
  }, [isTyping]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-600/25">
          <MessageCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          AI Health Assistant
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-500">
          Ask me anything about health, nutrition, fitness, or your calculator results.
          I use evidence-based information to give you instant, personalised answers.
        </p>
      </div>

      {/* Chat area */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex h-[500px] flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'ai' && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                )}
                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-teal-600 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                  }`}>
                    {msg.text}
                  </div>

                  {msg.reply?.personal && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-teal-800">
                      {msg.reply.personal}
                    </div>
                  )}

                  {msg.reply && msg.reply.related.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.reply.related.map((r) => (
                        <Link
                          key={r.id}
                          to={`/calculator/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {r.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow">
                    <Users className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your health question..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                aria-label="Type your health question"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Suggested questions */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-slate-900">Suggested Questions</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-violet-500" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm leading-relaxed text-amber-800">
          <strong>Important:</strong> This AI assistant provides general health information for educational purposes only.
          It is not a doctor and cannot diagnose conditions, prescribe medication, or replace professional medical advice.
          For any medical concern, always consult a qualified healthcare professional.
        </div>
      </div>
    </div>
  );
}

// ─── About Page ───
function AboutPage() {
  usePageMeta(
    'About VitaCalc Pro — Our Mission & Standards',
    'Learn about VitaCalc Pro: our mission to make professional health calculators accessible, our clinical standards, and our commitment to privacy.'
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-xl">
          <HeartHandshake className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-slate-900">
          About VitaCalc Pro
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Making professional-grade health calculators accessible to everyone, everywhere.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className="font-display text-2xl font-bold text-slate-900">Our Mission</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            VitaCalc Pro was built on a simple belief: everyone deserves access to the same quality of health
            information that professionals use. Our calculators implement formulas and standards from the world's
            leading medical organisations — the WHO, American Heart Association, American Diabetes Association,
            Institute of Medicine, and many others.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-slate-900">Clinical Standards</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { org: 'WHO', desc: 'BMI categories, growth standards, health guidelines' },
              { org: 'ACC/AHA', desc: 'Blood pressure classification, cardiovascular risk' },
              { org: 'ADA', desc: 'Diabetes screening, HbA1c interpretation' },
              { org: 'IOM / NAM', desc: 'Pregnancy weight gain recommendations' },
              { org: 'KDIGO', desc: 'Kidney disease staging (eGFR)' },
              { org: 'ACE', desc: 'Body fat percentage classification' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="font-bold text-teal-700">{item.org}</div>
                <div className="mt-1 text-sm text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-slate-900">Privacy First</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Your health data belongs to you. VitaCalc Pro is designed with privacy at its core:
          </p>
          <ul className="mt-4 space-y-3">
            {[
              'All calculations happen entirely on your device (client-side)',
              'No accounts, no sign-ups, no email collection',
              'No tracking cookies or analytics scripts',
              'Your saved results stay in your browser\'s local storage',
              'Export your data anytime — you\'re always in control',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span className="text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-slate-900">Medical Disclaimer</h2>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
              <div className="text-sm leading-relaxed text-amber-800">
                <p>
                  <strong>VitaCalc Pro provides health information for educational and informational purposes only.</strong>
                </p>
                <p className="mt-3">
                  The calculators, AI insights, and content on this website are not intended to be a substitute for
                  professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or
                  other qualified health provider with any questions you may have regarding a medical condition.
                </p>
                <p className="mt-3">
                  Never disregard professional medical advice or delay in seeking it because of something you have
                  read on this website. If you think you may have a medical emergency, call your doctor or emergency
                  services immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-slate-900">Technology</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Zap, title: 'Instant Results', desc: 'All computations happen in real-time on your device.' },
              { icon: Globe, title: 'PWA Ready', desc: 'Install as an app on any device for offline access.' },
              { icon: Lock, title: 'No Dependencies', desc: 'No external APIs, no data transmission, no accounts.' },
              { icon: Sparkles, title: 'AI-Powered', desc: 'Intelligent insights and personalised recommendations.' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                  <item.icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="mt-3 font-bold text-slate-900">{item.title}</div>
                <div className="mt-1 text-sm text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── 404 Page ───
function NotFoundPage() {
  usePageMeta('Page Not Found — VitaCalc Pro', 'The page you are looking for could not be found.');

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="font-display text-[120px] font-extrabold leading-none text-slate-200">404</div>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-slate-900">Page Not Found</h1>
      <p className="mt-4 text-lg text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-teal-600/25"
        >
          <Home className="h-4.5 w-4.5" />
          Go Home
        </Link>
        <Link
          to="/calculators"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 hover:bg-slate-50"
        >
          <LayoutGrid className="h-4.5 w-4.5" />
          Browse Calculators
        </Link>
      </div>
    </div>
  );
}

// ─── Main App ───
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SkipLink />
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calculators" element={<CalculatorsPage />} />
            <Route path="/calculator/:id" element={<CalculatorPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
