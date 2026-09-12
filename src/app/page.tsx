"use client";

import { useEffect, useState } from "react";
import { calculateTargets } from "@/lib/nutrition";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format } from "date-fns";
import { PlusCircle, Activity, Flame, Utensils, Droplets, Target, Scale, Settings as SettingsIcon, X, Camera, Trash2 } from "lucide-react";

export default function Home() {
  const [meals, setMeals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [mealsRes, settingsRes, weightRes, historyRes] = await Promise.all([
      fetch(`/api/meals?date=${today}`),
      fetch('/api/settings'),
      fetch('/api/weight'),
      fetch('/api/meals/history')
    ]);
    setMeals(await mealsRes.json());
    setSettings(await settingsRes.json());
    setWeightLogs(await weightRes.json());
    setHistory(await historyRes.json());
    setLoading(false);
  }

  if (loading || !settings) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Activity className="w-8 h-8 text-blue-500 animate-bounce" />
        <span className="text-gray-500 font-medium">טוען נתונים...</span>
      </div>
    </div>
  );

  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 110;
  
  const targets = calculateTargets(
    currentWeight, settings.height, settings.age, settings.gender,
    settings.activityLevel, settings.targetDeficit, settings.proteinPerKg,
    settings.manualCalorieTarget, settings.manualProteinTarget
  );

  const consumedCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const consumedProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const consumedCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const consumedFat = meals.reduce((sum, m) => sum + m.fat, 0);

  const calPercent = Math.min(100, (consumedCalories / targets.dailyCalorieTarget) * 100);
  const proPercent = Math.min(100, (consumedProtein / targets.targetProtein) * 100);

  const pieData = [
    { name: 'חלבון', value: consumedProtein * 4, color: '#3b82f6' },
    { name: 'פחמימות', value: consumedCarbs * 4, color: '#22c55e' },
    { name: 'שומן', value: consumedFat * 9, color: '#eab308' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-20 font-sans" dir="rtl">
      {/* Top Navbar */}
      <div className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Activity className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">NutritionAI</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsWeightOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-100 transition">
              <Scale className="w-4 h-4" /> 
              <span>{currentWeight} ק"ג</span>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6 mt-4">
        
        {/* Magic Input */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 p-2 pl-4 flex items-center gap-3">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('mealText') as HTMLInputElement;
            if (!input.value.trim()) return;
            
            const btn = form.elements.namedItem('submitBtn') as HTMLButtonElement;
            btn.disabled = true;
            
            try {
              await fetch('/api/meals/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input.value })
              });
              input.value = '';
              loadData();
            } finally {
              btn.disabled = false;
            }
          }} className="flex-1 flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600">
              <Utensils className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              name="mealText" 
              placeholder="ספר לי מה אכלת עכשיו... (למשל: סנדוויץ' חביתה)" 
              className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              autoComplete="off"
            />
            <label className="cursor-pointer text-gray-400 hover:text-blue-500 transition">
              <Camera className="w-6 h-6" />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // Show loading
                  setLoading(true);
                  
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = ev.target?.result;
                    if (base64) {
                      await fetch('/api/meals/analyze-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64, mimeType: file.type })
                      });
                      loadData();
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button 
              name="submitBtn"
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MacroCard title="קלוריות" icon={Flame} value={Math.round(consumedCalories)} target={Math.round(targets.dailyCalorieTarget)} percent={calPercent} color="bg-orange-500" />
          <MacroCard title="חלבון" icon={Target} value={Math.round(consumedProtein)} target={Math.round(targets.targetProtein)} percent={proPercent} color="bg-blue-500" suffix="g" />
          <MacroCard title="פחמימות" icon={Utensils} value={Math.round(consumedCarbs)} target={null} percent={null} color="bg-green-500" suffix="g" />
          <MacroCard title="שומן" icon={Droplets} value={Math.round(consumedFat)} target={null} percent={null} color="bg-yellow-500" suffix="g" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meals List */}
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/20">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">הארוחות שלי היום</h3>
              <div className="flex gap-2">
                <button onClick={async () => {
                  setLoading(true);
                  const res = await fetch('/api/tips/weekly');
                  const data = await res.json();
                  alert(data.tips);
                  setLoading(false);
                }} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 font-medium">✨ טיפ מהמאמן</button>
                <span className="text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">{meals.length} ארוחות</span>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-5 space-y-4">
              {meals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Utensils className="w-10 h-10 opacity-20" />
                  <p>עוד לא אכלת כלום היום!</p>
                </div>
              ) : (
                meals.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-4 rounded-xl border dark:border-zinc-800 hover:shadow-md transition bg-gray-50/30 dark:bg-zinc-800/30 group">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{m.originalText || m.name}</h4>
                      <p className="text-sm text-gray-500 mt-1 flex gap-3">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500"/> {m.calories} קק"ל</span>
                        <span className="flex items-center gap-1"><Target className="w-3 h-3 text-blue-500"/> {m.protein}g חלבון</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m.source === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {m.source === 'whatsapp' ? 'WhatsApp' : 'Web'}
                      </span>
                      <button onClick={async () => {
                        if (confirm('למחוק ארוחה זו?')) {
                          setLoading(true);
                          await fetch(`/api/meals/${m.id}`, { method: 'DELETE' });
                          loadData();
                        }
                      }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 p-5 h-[400px] flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">התפלגות מאקרו (היום)</h3>
            <div className="flex-1 flex items-center justify-center">
              {pieData.length === 0 ? (
                <p className="text-gray-400 text-sm">אין נתונים להיום</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: any) => `${Math.round(Number(val) || 0)} קק"ל`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calorie History */}
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 p-5 h-[300px] flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">קלוריות - 7 ימים אחרונים</h3>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} width={40} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="calories" name="קלוריות" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Line type="step" dataKey={() => Math.round(targets.dailyCalorieTarget)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="יעד" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weight Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 p-5 h-[300px] flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">מגמת משקל</h3>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(v: any) => format(new Date(v), 'dd/MM')} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} width={40} />
                  <Tooltip 
                    labelFormatter={(v: any) => format(new Date(v), 'dd/MM/yyyy')}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Line type="monotone" dataKey="weight" name="משקל" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <Modal title="הגדרות תוכנית" onClose={() => setIsSettingsOpen(false)}>
          <form onSubmit={async(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = {
              targetDeficit: parseInt((form.elements.namedItem('targetDeficit') as HTMLInputElement).value),
              proteinPerKg: parseFloat((form.elements.namedItem('proteinPerKg') as HTMLInputElement).value),
              activityLevel: parseFloat((form.elements.namedItem('activityLevel') as HTMLSelectElement).value),
              age: parseInt((form.elements.namedItem('age') as HTMLInputElement).value),
              height: parseInt((form.elements.namedItem('height') as HTMLInputElement).value),
              gender: (form.elements.namedItem('gender') as HTMLSelectElement).value,
              manualCalorieTarget: parseInt((form.elements.namedItem('manualCalorieTarget') as HTMLInputElement).value) || null,
              manualProteinTarget: parseInt((form.elements.namedItem('manualProteinTarget') as HTMLInputElement).value) || null,
            };
            await fetch('/api/settings/update', { method: 'POST', body: JSON.stringify(data) });
            setIsSettingsOpen(false);
            loadData();
          }} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            
            <h4 className="font-bold text-blue-600 border-b pb-1">נתונים אישיים (לחישוב אוטומטי)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">גיל</label>
                <input type="number" name="age" defaultValue={settings.age} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">גובה (ס"מ)</label>
                <input type="number" name="height" defaultValue={settings.height} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מין</label>
              <select name="gender" defaultValue={settings.gender} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" dir="rtl">
                <option value="male">זכר</option>
                <option value="female">נקבה</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">רמת פעילות</label>
              <select name="activityLevel" defaultValue={settings.activityLevel} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" dir="rtl">
                <option value="1.2">ללא פעילות (יושבני)</option>
                <option value="1.375">פעילות קלה (1-3 פעמים בשבוע)</option>
                <option value="1.55">פעילות בינונית (3-5 פעמים)</option>
                <option value="1.725">פעילות עצימה (6-7 פעמים)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">גירעון קלורי (קק"ל)</label>
              <input type="number" name="targetDeficit" defaultValue={settings.targetDeficit} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">חלבון לק"ג משקל (גרם)</label>
              <input type="number" step="0.1" name="proteinPerKg" defaultValue={settings.proteinPerKg} className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
            </div>

            <h4 className="font-bold text-orange-500 border-b pb-1 mt-6">הגדרת יעדים ידנית (דורס את החישוב)</h4>
            <p className="text-xs text-gray-500">השאר ריק כדי להמשיך להשתמש בחישוב האוטומטי שלנו.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">יעד קלוריות יומי</label>
                <input type="number" name="manualCalorieTarget" defaultValue={settings.manualCalorieTarget} placeholder="לדוגמה: 2000" className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">יעד חלבון יומי</label>
                <input type="number" name="manualProteinTarget" defaultValue={settings.manualProteinTarget} placeholder="לדוגמה: 150" className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-4">שמור הגדרות</button>
          </form>
        </Modal>
      )}

      {/* Weight Modal */}
      {isWeightOpen && (
        <Modal title="עדכון שקילה" onClose={() => setIsWeightOpen(false)}>
          <form onSubmit={async(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const weight = (form.elements.namedItem('weight') as HTMLInputElement).value;
            await fetch('/api/weight/add', { method: 'POST', body: JSON.stringify({ weight }) });
            setIsWeightOpen(false);
            loadData();
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">משקל נוכחי (ק"ג)</label>
              <input type="number" step="0.1" name="weight" defaultValue={currentWeight} className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-center text-2xl font-bold text-blue-600" autoFocus />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium mt-2">עדכן משקל</button>
          </form>
        </Modal>
      )}

    </div>
  );
}

function MacroCard({ title, icon: Icon, value, target, percent, color, suffix = "" }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border dark:border-zinc-800 relative overflow-hidden group hover:border-blue-200 transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-500 dark:text-gray-400 font-medium">{title}</h3>
        <div className={`p-2 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
        {target && <span className="text-sm text-gray-500 font-medium">/ {target}</span>}
        {suffix && <span className="text-sm text-gray-500 font-medium">{suffix}</span>}
      </div>
      
      {percent !== null && (
        <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5 mt-4 overflow-hidden">
          <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
