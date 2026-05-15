'use client';

/**
 * Diet Page — /dashboard/diet
 * Regional food suggestions with nutrition facts, goal-based meal plans,
 * and daily calorie tracking.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface MealLog {
  id: string;
  mealType: string;
  foodName: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quantity: number | null;
  unit: string | null;
  loggedAt: string;
}

interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  byMealType: { breakfast: number; lunch: number; dinner: number; snack: number };
}

interface ProfileData {
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  dietaryPreference?: string;
}

// ═══════════════════════════════════════════
// FOOD DATA — Regional Indian Foods
// ═══════════════════════════════════════════

interface FoodItem {
  name: string;
  region: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  mealType: string;
}

const REGIONAL_FOODS: FoodItem[] = [
  // South India
  { name: 'Idli (2 pcs) + Sambar', region: 'South', calories: 170, protein: 6, carbs: 33, fat: 2.5, serving: '2 idlis + 1 cup sambar', mealType: 'breakfast' },
  { name: 'Masala Dosa + Chutney', region: 'South', calories: 250, protein: 5, carbs: 35, fat: 10, serving: '1 dosa', mealType: 'breakfast' },
  { name: 'Upma', region: 'South', calories: 210, protein: 5, carbs: 30, fat: 8, serving: '1 cup', mealType: 'breakfast' },
  { name: 'Rasam Rice', region: 'South', calories: 280, protein: 6, carbs: 48, fat: 5, serving: '1 plate', mealType: 'lunch' },
  { name: 'Fish Curry (Kerala)', region: 'South', calories: 180, protein: 22, carbs: 8, fat: 7, serving: '1 serving', mealType: 'lunch' },
  { name: 'Curd Rice', region: 'South', calories: 220, protein: 7, carbs: 35, fat: 5, serving: '1 bowl', mealType: 'dinner' },

  // North India
  { name: 'Aloo Paratha + Curd', region: 'North', calories: 310, protein: 8, carbs: 42, fat: 12, serving: '1 paratha + curd', mealType: 'breakfast' },
  { name: 'Paneer Bhurji + Roti', region: 'North', calories: 350, protein: 18, carbs: 28, fat: 18, serving: '1 serving + 2 roti', mealType: 'breakfast' },
  { name: 'Rajma Chawal', region: 'North', calories: 420, protein: 14, carbs: 62, fat: 10, serving: '1 plate', mealType: 'lunch' },
  { name: 'Dal Makhani + Roti', region: 'North', calories: 380, protein: 12, carbs: 45, fat: 15, serving: '1 bowl + 2 roti', mealType: 'lunch' },
  { name: 'Chicken Curry + Rice', region: 'North', calories: 450, protein: 28, carbs: 45, fat: 16, serving: '1 plate', mealType: 'dinner' },
  { name: 'Roti + Sabzi + Dal', region: 'North', calories: 380, protein: 14, carbs: 52, fat: 12, serving: '2 roti + sides', mealType: 'dinner' },

  // West India
  { name: 'Poha', region: 'West', calories: 180, protein: 4, carbs: 30, fat: 5, serving: '1 cup', mealType: 'breakfast' },
  { name: 'Dhokla (4 pcs)', region: 'West', calories: 160, protein: 6, carbs: 28, fat: 3, serving: '4 pieces', mealType: 'breakfast' },
  { name: 'Thepla + Pickle', region: 'West', calories: 200, protein: 5, carbs: 28, fat: 8, serving: '2 theplas', mealType: 'breakfast' },
  { name: 'Undhiyu', region: 'West', calories: 280, protein: 8, carbs: 32, fat: 14, serving: '1 bowl', mealType: 'lunch' },
  { name: 'Pav Bhaji', region: 'West', calories: 400, protein: 10, carbs: 52, fat: 16, serving: '2 pav + bhaji', mealType: 'dinner' },
  { name: 'Dal Dhokli', region: 'West', calories: 320, protein: 10, carbs: 48, fat: 9, serving: '1 bowl', mealType: 'lunch' },

  // East India
  { name: 'Luchi + Aloo Dum', region: 'East', calories: 350, protein: 7, carbs: 45, fat: 15, serving: '3 luchi + curry', mealType: 'breakfast' },
  { name: 'Fish Fry (Bengali)', region: 'East', calories: 200, protein: 20, carbs: 8, fat: 10, serving: '1 piece', mealType: 'lunch' },
  { name: 'Moong Dal Khichdi', region: 'East', calories: 250, protein: 10, carbs: 40, fat: 5, serving: '1 plate', mealType: 'dinner' },

  // Snacks (All regions)
  { name: 'Roasted Chana', region: 'All', calories: 120, protein: 7, carbs: 18, fat: 2.5, serving: '50g', mealType: 'snack' },
  { name: 'Banana', region: 'All', calories: 90, protein: 1, carbs: 23, fat: 0.3, serving: '1 medium', mealType: 'snack' },
  { name: 'Almonds (10 pcs)', region: 'All', calories: 70, protein: 2.5, carbs: 2.5, fat: 6, serving: '10 pieces', mealType: 'snack' },
  { name: 'Greek Yogurt', region: 'All', calories: 100, protein: 10, carbs: 6, fat: 4, serving: '150g', mealType: 'snack' },
  { name: 'Sprouts Chaat', region: 'All', calories: 150, protein: 9, carbs: 20, fat: 3, serving: '1 bowl', mealType: 'snack' },
  { name: 'Peanut Butter Toast', region: 'All', calories: 250, protein: 9, carbs: 22, fat: 14, serving: '1 slice + 2 tbsp', mealType: 'snack' },
];

// ═══════════════════════════════════════════
// GOAL-BASED MEAL PLANS
// ═══════════════════════════════════════════

interface MealPlan {
  goal: string;
  calorieRange: string;
  meals: { type: string; suggestion: string; calories: number }[];
}

const GOAL_PLANS: MealPlan[] = [
  {
    goal: 'lose_weight',
    calorieRange: '1,400 – 1,800 kcal/day',
    meals: [
      { type: 'Breakfast', suggestion: '2 Egg whites omelette + 1 multigrain toast + green tea', calories: 230 },
      { type: 'Mid-Morning', suggestion: '1 apple + 6 almonds', calories: 120 },
      { type: 'Lunch', suggestion: '1 roti + dal (1 cup) + sabzi + salad', calories: 360 },
      { type: 'Snack', suggestion: 'Greek yogurt (100g) + green tea', calories: 80 },
      { type: 'Dinner', suggestion: 'Grilled paneer tikka (100g) + sautéed veggies', calories: 280 },
    ],
  },
  {
    goal: 'build_muscle',
    calorieRange: '2,500 – 3,000 kcal/day',
    meals: [
      { type: 'Breakfast', suggestion: '3 egg omelette + 2 wheat toast + milk (200ml)', calories: 490 },
      { type: 'Mid-Morning', suggestion: 'Roasted chana (50g) + banana', calories: 270 },
      { type: 'Lunch', suggestion: 'Rice (1.5 cups) + chicken curry/chana masala + curd + salad', calories: 680 },
      { type: 'Snack', suggestion: 'Peanut butter sandwich (wheat) + black coffee', calories: 320 },
      { type: 'Dinner', suggestion: 'Fish/paneer bhurji + 2-3 roti + stir-fry broccoli + fruit bowl', calories: 560 },
    ],
  },
  {
    goal: 'maintain',
    calorieRange: '2,000 – 2,400 kcal/day',
    meals: [
      { type: 'Breakfast', suggestion: 'Vegetable upma (1 cup) + banana', calories: 340 },
      { type: 'Mid-Morning', suggestion: 'Buttermilk (200ml) + 10 peanuts', calories: 80 },
      { type: 'Lunch', suggestion: 'Brown rice + rajma curry + mixed salad', calories: 485 },
      { type: 'Snack', suggestion: 'Moong dal chilla (2) + mint chutney', calories: 220 },
      { type: 'Dinner', suggestion: 'Grilled chicken/paneer + 2 roti + saag', calories: 455 },
    ],
  },
  {
    goal: 'endurance',
    calorieRange: '2,200 – 2,800 kcal/day',
    meals: [
      { type: 'Breakfast', suggestion: 'Oats porridge + banana + nuts + honey', calories: 420 },
      { type: 'Mid-Morning', suggestion: 'Fruit smoothie + chia seeds', calories: 200 },
      { type: 'Lunch', suggestion: 'Rice + dal + fish/egg curry + vegetables', calories: 550 },
      { type: 'Snack', suggestion: 'Sweet potato (boiled) + sprouts', calories: 250 },
      { type: 'Dinner', suggestion: 'Quinoa bowl + grilled chicken/tofu + greens', calories: 480 },
    ],
  },
];

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Weight Loss',
  build_muscle: 'Muscle Building',
  maintain: 'Maintenance',
  endurance: 'Endurance',
  flexibility: 'Flexibility',
};

// ═══════════════════════════════════════════
// TDEE CALCULATOR
// ═══════════════════════════════════════════

function calcTDEE(weight?: number, height?: number, age?: number, gender?: string, activityLevel?: string): number | null {
  if (!weight || !height || !age) return null;
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (multipliers[activityLevel || 'moderate'] || 1.55));
}

function getCalorieTarget(tdee: number | null, goal?: string): number | null {
  if (!tdee) return null;
  switch (goal) {
    case 'lose_weight': return tdee - 500;
    case 'build_muscle': return tdee + 300;
    default: return tdee;
  }
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

type TabType = 'tracker' | 'suggestions' | 'mealplan';

export default function DietPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('tracker');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [mealFilter, setMealFilter] = useState<string>('all');

  // Meal log form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ mealType: 'breakfast', foodName: '', calories: '', protein: '', carbs: '', fat: '', quantity: '', unit: 'g' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, dietRes] = await Promise.all([
          api.get<{ profile: ProfileData }>('/profile'),
          api.get<{ logs: MealLog[]; summary: DailySummary }>('/diet/logs'),
        ]);
        if (profileRes.data?.profile) setProfile(profileRes.data.profile);
        if (dietRes.data) {
          setLogs(dietRes.data.logs || []);
          setSummary(dietRes.data.summary || null);
        }
      } catch { /* fallback */ }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const tdee = calcTDEE(profile?.weight, profile?.height, profile?.age, profile?.gender, profile?.activityLevel);
  const calorieTarget = getCalorieTarget(tdee, profile?.fitnessGoal);
  const consumed = summary?.totalCalories || 0;
  const remaining = calorieTarget ? Math.max(0, calorieTarget - consumed) : null;

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.foodName || !formData.calories) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ log: MealLog }>('/diet/logs', {
        ...formData,
        calories: parseInt(formData.calories),
        protein: formData.protein ? parseFloat(formData.protein) : null,
        carbs: formData.carbs ? parseFloat(formData.carbs) : null,
        fat: formData.fat ? parseFloat(formData.fat) : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      });
      if (res.data?.log) {
        setLogs([res.data.log, ...logs]);
        setSummary(prev => prev ? {
          ...prev,
          totalCalories: prev.totalCalories + parseInt(formData.calories),
          totalProtein: prev.totalProtein + (formData.protein ? parseFloat(formData.protein) : 0),
          totalCarbs: prev.totalCarbs + (formData.carbs ? parseFloat(formData.carbs) : 0),
          totalFat: prev.totalFat + (formData.fat ? parseFloat(formData.fat) : 0),
          mealCount: prev.mealCount + 1,
        } : null);
        setFormData({ mealType: 'breakfast', foodName: '', calories: '', protein: '', carbs: '', fat: '', quantity: '', unit: 'g' });
        setShowForm(false);
      }
    } catch { /* */ }
    finally { setSubmitting(false); }
  };

  const handleQuickAdd = async (food: FoodItem) => {
    setSubmitting(true);
    try {
      const res = await api.post<{ log: MealLog }>('/diet/logs', {
        mealType: food.mealType,
        foodName: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        quantity: 1,
        unit: 'serving',
      });
      if (res.data?.log) {
        setLogs([res.data.log, ...logs]);
        setSummary(prev => prev ? {
          ...prev,
          totalCalories: prev.totalCalories + food.calories,
          totalProtein: prev.totalProtein + food.protein,
          totalCarbs: prev.totalCarbs + food.carbs,
          totalFat: prev.totalFat + food.fat,
          mealCount: prev.mealCount + 1,
        } : null);
      }
    } catch { /* */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, cal: number) => {
    try {
      await api.delete(`/diet/logs/${id}`);
      setLogs(logs.filter(l => l.id !== id));
      setSummary(prev => prev ? { ...prev, totalCalories: prev.totalCalories - cal, mealCount: prev.mealCount - 1 } : null);
    } catch { /* */ }
  };

  // Filtered foods
  const filteredFoods = REGIONAL_FOODS.filter(f => {
    const regionMatch = regionFilter === 'All' || f.region === regionFilter;
    const mealMatch = mealFilter === 'all' || f.mealType === mealFilter;
    return regionMatch && mealMatch;
  });

  // Active goal plan
  const activePlan = GOAL_PLANS.find(p => p.goal === profile?.fitnessGoal) || GOAL_PLANS[2];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-white/20";
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      {/* Header */}
      <div className="mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Diet & Nutrition</h1>
        <p className="mt-1 text-sm text-white opacity-50">
          {calorieTarget ? `Daily target: ${calorieTarget} kcal` : 'Track Your Nutrition'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['tracker', 'suggestions', 'mealplan'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold transition-all cursor-pointer"
            style={{ color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)', borderBottom: tab === t ? '2px solid #fff' : '2px solid transparent' }}
          >
            {t === 'tracker' ? 'Calorie Tracker' : t === 'suggestions' ? 'Food Suggestions' : 'Meal Plan'}
          </button>
        ))}
      </div>

      {/* ═══ TAB: CALORIE TRACKER ═══ */}
      {tab === 'tracker' && (
        <div>
          {/* Daily Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Consumed" value={`${consumed}`} unit="kcal" accent={consumed > (calorieTarget || 9999) ? '#f87171' : '#4ade80'} />
            <SummaryCard label="Remaining" value={remaining !== null ? `${remaining}` : '—'} unit="kcal" accent="#60a5fa" />
            <SummaryCard label="Protein" value={`${Math.round(summary?.totalProtein || 0)}`} unit="g" accent="#a78bfa" />
            <SummaryCard label="Meals Today" value={`${summary?.mealCount || 0}`} unit="" accent="#fbbf24" />
          </div>

          {/* Calorie Progress Bar */}
          {calorieTarget && (
            <div className="mb-8 p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-[0.15em] uppercase text-white opacity-50">Daily Progress</span>
                <span className="text-[11px] font-semibold text-white">{consumed} / {calorieTarget} kcal</span>
              </div>
              <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (consumed / calorieTarget) * 100)}%`, background: consumed > calorieTarget ? '#f87171' : '#4ade80' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-white opacity-35">Protein: {Math.round(summary?.totalProtein || 0)}g</span>
                <span className="text-[9px] text-white opacity-35">Carbs: {Math.round(summary?.totalCarbs || 0)}g</span>
                <span className="text-[9px] text-white opacity-35">Fat: {Math.round(summary?.totalFat || 0)}g</span>
              </div>
            </div>
          )}

          {/* Log Meal Button */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white opacity-50">Today&apos;s Meals</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-[11px] tracking-[0.2em] uppercase font-semibold px-5 py-2 cursor-pointer transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff', background: showForm ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              {showForm ? '✕ Cancel' : '+ Log Meal'}
            </button>
          </div>

          {/* Meal Log Form */}
          {showForm && (
            <form onSubmit={handleLogMeal} className="mb-8 p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Meal Type</label>
                  <select value={formData.mealType} onChange={e => setFormData({ ...formData, mealType: e.target.value })} className={inputClass} style={inputStyle}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-2">
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Food Name</label>
                  <input value={formData.foodName} onChange={e => setFormData({ ...formData, foodName: e.target.value })} placeholder="e.g., Chicken Rice Bowl" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Calories (kcal)</label>
                  <input type="number" value={formData.calories} onChange={e => setFormData({ ...formData, calories: e.target.value })} placeholder="350" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Protein (g)</label>
                  <input type="number" value={formData.protein} onChange={e => setFormData({ ...formData, protein: e.target.value })} placeholder="20" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Carbs (g)</label>
                  <input type="number" value={formData.carbs} onChange={e => setFormData({ ...formData, carbs: e.target.value })} placeholder="45" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Fat (g)</label>
                  <input type="number" value={formData.fat} onChange={e => setFormData({ ...formData, fat: e.target.value })} placeholder="12" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Quantity</label>
                  <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} placeholder="1" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45 mb-1 block">Unit</label>
                  <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className={inputClass} style={inputStyle}>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece</option>
                    <option value="cup">cup</option>
                    <option value="plate">plate</option>
                    <option value="serving">serving</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="text-[11px] tracking-[0.2em] uppercase font-semibold px-6 py-2.5 cursor-pointer transition-all disabled:opacity-50" style={{ background: '#fff', color: '#000' }}>
                {submitting ? 'Logging...' : 'Log Meal'}
              </button>
            </form>
          )}

          {/* Today's Meal List */}
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 20).map(log => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                      {log.mealType}
                    </span>
                    <span className="text-[13px] font-medium text-white">{log.foodName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] font-semibold text-white">{log.calories} kcal</span>
                    {log.protein && <span className="text-[10px] text-white opacity-40">P:{log.protein}g</span>}
                    <button onClick={() => handleDelete(log.id, log.calories)} className="text-white opacity-30 hover:opacity-80 transition-opacity cursor-pointer text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[11px] tracking-[0.2em] uppercase text-white opacity-30">No meals logged today</p>
              <p className="text-[10px] text-white opacity-20 mt-1">Click &quot;Log Meal&quot; or use quick-add from Food Suggestions</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: FOOD SUGGESTIONS ═══ */}
      {tab === 'suggestions' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex gap-1">
              {['All', 'North', 'South', 'West', 'East'].map(r => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className="text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 cursor-pointer transition-all"
                  style={{ background: regionFilter === r ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: regionFilter === r ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map(m => (
                <button
                  key={m}
                  onClick={() => setMealFilter(m)}
                  className="text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 cursor-pointer transition-all"
                  style={{ background: mealFilter === m ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: mealFilter === m ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {m === 'all' ? 'All Meals' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Food Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFoods.map((food, i) => (
              <div key={i} className="p-4 transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">{food.name}</h4>
                    <p className="text-[10px] text-white opacity-35 mt-0.5">{food.region} India • {food.serving}</p>
                  </div>
                  <span className="text-[10px] tracking-[0.1em] uppercase font-semibold px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {food.mealType}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3 mb-3">
                  <span className="text-[16px] font-bold text-white">{food.calories}</span>
                  <span className="text-[10px] text-white opacity-40">kcal</span>
                </div>
                <div className="flex gap-4 mb-3">
                  <NutriBadge label="Protein" value={`${food.protein}g`} />
                  <NutriBadge label="Carbs" value={`${food.carbs}g`} />
                  <NutriBadge label="Fat" value={`${food.fat}g`} />
                </div>
                <button
                  onClick={() => handleQuickAdd(food)}
                  disabled={submitting}
                  className="text-[9px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 cursor-pointer transition-all w-full disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}
                >
                  + Quick Add to Tracker
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB: MEAL PLAN ═══ */}
      {tab === 'mealplan' && (
        <div>
          {/* Goal-based recommendation */}
          <div className="mb-8 p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-[11px] tracking-[0.3em] uppercase font-semibold text-white opacity-60">
                Recommended Plan
              </h3>
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5" style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }}>
                {GOAL_LABELS[activePlan.goal] || 'Maintenance'}
              </span>
            </div>
            <p className="text-[12px] text-white opacity-40 mb-5">
              Target: {activePlan.calorieRange} • Based on your profile goals
            </p>

            <div className="space-y-3">
              {activePlan.meals.map((meal, i) => (
                <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] tracking-[0.15em] uppercase font-semibold w-24 text-white opacity-45">{meal.type}</span>
                    <span className="text-[12px] text-white opacity-80">{meal.suggestion}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white shrink-0">{meal.calories} kcal</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-white opacity-60">Total</span>
                <span className="text-[14px] font-bold text-white">
                  {activePlan.meals.reduce((s, m) => s + m.calories, 0)} kcal
                </span>
              </div>
            </div>
          </div>

          {/* All Goal Plans */}
          <h3 className="text-[11px] tracking-[0.3em] uppercase font-semibold text-white opacity-50 mb-4">All Goal Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOAL_PLANS.filter(p => p.goal !== activePlan.goal).map(plan => (
              <div key={plan.goal} className="p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white opacity-60 mb-1">{GOAL_LABELS[plan.goal]}</h4>
                <p className="text-[10px] text-white opacity-35 mb-3">{plan.calorieRange}</p>
                {plan.meals.map((m, i) => (
                  <div key={i} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-[10px] text-white opacity-50">{m.type}: {m.suggestion.substring(0, 40)}...</span>
                    <span className="text-[10px] font-semibold text-white opacity-60">{m.calories}</span>
                  </div>
                ))}
                <div className="mt-2 text-right">
                  <span className="text-[11px] font-bold text-white opacity-50">
                    Total: {plan.meals.reduce((s, m) => s + m.calories, 0)} kcal
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-8 p-5" style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid rgba(255,255,255,0.2)' }}>
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white opacity-50 mb-3">Nutrition Tips</h4>
            <ul className="space-y-2">
              <li className="text-[12px] text-white opacity-50">• Drink 3-4 litres of water daily for optimal metabolism</li>
              <li className="text-[12px] text-white opacity-50">• Eat protein within 30 mins after workouts for muscle recovery</li>
              <li className="text-[12px] text-white opacity-50">• Avoid processed/fried food, prefer grilled or steamed options</li>
              <li className="text-[12px] text-white opacity-50">• Load up on green vegetables for micronutrients and fiber</li>
              <li className="text-[12px] text-white opacity-50">• Split meals into 5-6 smaller portions instead of 3 large ones</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function SummaryCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div className="p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white opacity-40 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: accent }}>{value}</span>
        {unit && <span className="text-[10px] text-white opacity-40">{unit}</span>}
      </div>
    </div>
  );
}

function NutriBadge({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] tracking-[0.1em] uppercase text-white opacity-35 block">{label}</span>
      <span className="text-[12px] font-semibold text-white opacity-70">{value}</span>
    </div>
  );
}
