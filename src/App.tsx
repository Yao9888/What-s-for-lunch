/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Utensils, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ChevronLeft, 
  Download, 
  Upload,
  Check,
  X,
  ClipboardList,
  Play,
  CheckCircle,
  AlertCircle,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { Category, FoodData } from './types';
import { INITIAL_CATEGORIES, STORAGE_KEY } from './constants';

type View = 'home' | 'manager' | 'questionnaire' | 'settings' | 'lottery';

export default function App() {
  const [data, setData] = useState<FoodData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { categories: INITIAL_CATEGORIES };
  });
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [spinningText, setSpinningText] = useState('');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleReset = () => {
    // Deep clone to ensure we don't have reference issues with the initial constant
    const freshData = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    setData({ categories: freshData });
    setShowResetConfirm(false);
    setCurrentView('home');
    // Optional: Reset selection
    setSelectedCategoryId('all');
  };

  const startLottery = () => {
    const pool = selectedCategoryId === 'all' 
      ? data.categories.flatMap(c => c.shops)
      : data.categories.find(c => c.id === selectedCategoryId)?.shops || [];

    if (pool.length === 0) {
      alert('库里还没有美食哦，快去添加吧！');
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setCurrentView('lottery');

    let count = 0;
    const duration = 6000;
    const interval = 100;

    timerRef.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setSpinningText(pool[randomIndex]);
      count += interval;
      
      if (count >= duration) {
        stopLottery(pool);
      }
    }, interval);
  };

  const stopLottery = (pool: string[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalIndex = Math.floor(Math.random() * pool.length);
    setResult(pool[finalIndex]);
    setIsSpinning(false);
  };

  const skipAnimation = () => {
    const pool = selectedCategoryId === 'all' 
      ? data.categories.flatMap(c => c.shops)
      : data.categories.find(c => c.id === selectedCategoryId)?.shops || [];
    stopLottery(pool);
  };

  const handleAddCategory = (name: string) => {
    if (!name.trim()) return;
    const newId = Date.now().toString();
    setData(prev => ({
      categories: [...prev.categories, { id: newId, name: name.trim(), shops: [] }]
    }));
    return newId;
  };

  const handleDeleteCategory = (id: string) => {
    if (data.categories.length <= 1) {
      alert('至少保留一个分类哦！');
      return;
    }
    setData(prev => ({
      categories: prev.categories.filter(c => c.id !== id)
    }));
    if (selectedCategoryId === id) setSelectedCategoryId('all');
  };

  const handleAddShop = (categoryId: string, shopName: string) => {
    if (!shopName.trim()) return;
    setData(prev => ({
      categories: prev.categories.map(c => 
        c.id === categoryId 
          ? { ...c, shops: Array.from(new Set([...c.shops, shopName.trim()])) }
          : c
      )
    }));
  };

  const handleDeleteShop = (categoryId: string, shopName: string) => {
    setData(prev => ({
      categories: prev.categories.map(c => 
        c.id === categoryId 
          ? { ...c, shops: c.shops.filter(s => s !== shopName) }
          : c
      )
    }));
  };

  const handleBatchDelete = (categoryId: string, shopNames: string[]) => {
    setData(prev => ({
      categories: prev.categories.map(c => 
        c.id === categoryId 
          ? { ...c, shops: c.shops.filter(s => !shopNames.includes(s)) }
          : c
      )
    }));
  };

  const handleClearCategory = (categoryId: string) => {
    setData(prev => ({
      categories: prev.categories.map(c => 
        c.id === categoryId ? { ...c, shops: [] } : c
      )
    }));
  };

  const handleQuestionnaireSubmit = (answers: Record<string, string>) => {
    setData(prev => ({
      categories: prev.categories.map(c => {
        const input = answers[c.id] || '';
        const newShops = input.split(/\s+/).filter(s => s.trim() && !c.shops.includes(s.trim()));
        return { ...c, shops: [...c.shops, ...newShops] };
      })
    }));
    setCurrentView('home');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.categories) {
          setData(imported);
          setFeedback({ type: 'success', message: '数据导入成功！' });
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        setFeedback({ type: 'error', message: '导入失败，请检查文件格式。' });
      } finally {
        // Clear input so same file can be selected again
        e.target.value = '';
        // Auto hide feedback
        setTimeout(() => setFeedback(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center sm:p-4 bg-brand-bg">
      <div className="w-full sm:max-w-[420px] h-screen sm:h-[800px] sm:max-h-[90vh] bg-white flex flex-col overflow-hidden relative sm:hand-drawn-border">
        {/* Header */}
        <header className="p-6 flex items-center justify-between border-b-2 border-brand-primary/10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white border-2 border-brand-primary rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-xl">吃</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">中午吃什么</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('settings')} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentView === 'home' && (
              <HomeView 
                categories={data.categories} 
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                onStart={startLottery}
                onGoToManager={() => setCurrentView('manager')}
                onGoToQuestionnaire={() => setCurrentView('questionnaire')}
              />
            )}
            {currentView === 'manager' && (
              <ManagerView 
                categories={data.categories}
                onBack={() => setCurrentView('home')}
                onAddShop={handleAddShop}
                onDeleteShop={handleDeleteShop}
                onBatchDelete={handleBatchDelete}
                onClearCategory={handleClearCategory}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}
            {currentView === 'questionnaire' && (
              <QuestionnaireView 
                categories={data.categories}
                onBack={() => setCurrentView('home')}
                onSubmit={handleQuestionnaireSubmit}
              />
            )}
            {currentView === 'settings' && (
              <SettingsView 
                onBack={() => setCurrentView('home')}
                onExport={exportData}
                onImport={importData}
                onReset={() => setShowResetConfirm(true)}
                onDonate={() => setShowDonation(true)}
              />
            )}
            {currentView === 'lottery' && (
              <LotteryView 
                isSpinning={isSpinning}
                spinningText={spinningText}
                result={result}
                onSkip={skipAnimation}
                onBack={() => setCurrentView('home')}
                onRetry={startLottery}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Footer Navigation (only on some views) */}
        {['home', 'manager', 'questionnaire'].includes(currentView) && (
          <footer className="p-4 border-t-2 border-brand-primary/10 flex justify-around bg-white">
            <button 
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center gap-1 ${currentView === 'home' ? 'text-brand-primary' : 'text-gray-400'}`}
            >
              <Utensils size={24} />
              <span className="text-xs font-bold">抽奖</span>
            </button>
            <button 
              onClick={() => setCurrentView('manager')}
              className={`flex flex-col items-center gap-1 ${currentView === 'manager' ? 'text-brand-primary' : 'text-gray-400'}`}
            >
              <Plus size={24} />
              <span className="text-xs font-bold">管理</span>
            </button>
            <button 
              onClick={() => setCurrentView('questionnaire')}
              className={`flex flex-col items-center gap-1 ${currentView === 'questionnaire' ? 'text-brand-primary' : 'text-gray-400'}`}
            >
              <ClipboardList size={24} />
              <span className="text-xs font-bold">问卷</span>
            </button>
          </footer>
        )}
        {/* Confirm Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-[300px] rounded-3xl p-6 hand-drawn-border shadow-2xl space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RotateCcw size={32} />
                  </div>
                  <h3 className="text-xl font-bold">重置数据？</h3>
                  <p className="text-gray-500 text-sm">确定要重置所有数据吗？这将恢复到初始的美食库设置。</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleReset}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    确定重置
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Feedback Toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] w-max max-w-[90%]"
            >
              <div className={`px-6 py-3 rounded-full hand-drawn-border shadow-lg flex items-center gap-2 ${
                feedback.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="font-bold text-sm">{feedback.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Donation Modal */}
        <AnimatePresence>
          {showDonation && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-[320px] rounded-3xl p-8 hand-drawn-border shadow-2xl space-y-6 relative"
              >
                <button 
                  onClick={() => setShowDonation(false)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-brand-primary transition-colors"
                >
                  <X size={24} />
                </button>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-brand-primary">打赏作者</h3>
                  <p className="text-gray-500 font-medium italic text-sm">“打赏随心、感谢喜欢”</p>
                </div>

                <div className="relative">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                    <img 
                      src="/api/attachments/975618f0-f001-447a-8532-680451457497" 
                      alt="微信支付打赏码" 
                      className="w-full h-auto block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <p className="text-center text-[10px] text-gray-400">
                  您的支持是我持续更新的动力 ❤️
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-Views ---

function HomeView({ categories, selectedId, onSelect, onStart, onGoToManager, onGoToQuestionnaire }: any) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedCategory = categories.find((c: any) => c.id === selectedId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8 h-full"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">今天想吃点啥？</h2>
        <p className="text-gray-500 text-sm">别纠结了，让运气帮你决定吧 ✨</p>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-bold text-brand-primary/60 uppercase tracking-wider">选择范围</label>
        <div className="grid grid-cols-2 gap-3 relative">
          {/* Option 1: All */}
          <button 
            onClick={() => {
              onSelect('all');
              setIsDropdownOpen(false);
            }}
            className={`p-4 h-28 rounded-brand border-2 transition-all font-bold flex flex-col items-center justify-center gap-2 ${selectedId === 'all' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 bg-white text-brand-primary hover:border-brand-primary/30'}`}
          >
            <div className="text-2xl">🌍</div>
            <span>全库抽奖</span>
          </button>

          {/* Option 2: Selectable */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full h-28 p-4 rounded-brand border-2 transition-all font-bold flex flex-col items-center justify-center gap-2 ${selectedId !== 'all' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 bg-white text-brand-primary hover:border-brand-primary/30'}`}
            >
              <div className="text-2xl">🍱</div>
              <span className="truncate w-full text-center text-sm">
                {selectedId === 'all' ? '指定分类' : selectedCategory?.name}
              </span>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white hand-drawn-border z-20 max-h-60 overflow-y-auto p-2 shadow-xl"
                  >
                    <div className="text-[10px] font-bold text-gray-400 px-2 pb-2 uppercase tracking-widest border-b border-gray-100 mb-2">选择一个分类</div>
                    {categories.map((c: any) => (
                      <button 
                        key={c.id}
                        onClick={() => {
                          onSelect(c.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all mb-1 last:mb-0 ${selectedId === c.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-bg text-brand-primary'}`}
                      >
                        {c.name}
                        <span className="ml-2 text-[10px] opacity-50 font-normal">({c.shops.length})</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-auto pb-8 flex flex-col gap-4">
        <button onClick={onStart} className="btn-accent w-full py-5 text-xl flex items-center justify-center gap-2">
          <Play fill="currentColor" />
          开始抽取
        </button>
        <div className="flex gap-3">
          <button onClick={onGoToQuestionnaire} className="btn-primary flex-1 py-4 text-sm bg-brand-bg text-brand-primary border-2 border-brand-primary shadow-none">
            智能问卷录入
          </button>
          <button onClick={onGoToManager} className="btn-primary flex-1 py-4 text-sm bg-brand-bg text-brand-primary border-2 border-brand-primary shadow-none">
            手动管理美食
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ManagerView({ categories, onBack, onAddShop, onDeleteShop, onBatchDelete, onClearCategory, onAddCategory, onDeleteCategory }: any) {
  const [activeTab, setActiveTab] = useState(categories[0]?.id);
  const [newShop, setNewShop] = useState('');
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const currentCategory = categories.find((c: any) => c.id === activeTab);

  // Ensure activeTab is valid if a category was deleted
  useEffect(() => {
    if (!categories.find((c: any) => c.id === activeTab)) {
      setActiveTab(categories[0]?.id);
    }
  }, [categories, activeTab]);

  const toggleSelect = (shop: string) => {
    setSelectedShops(prev => 
      prev.includes(shop) ? prev.filter(s => s !== shop) : [...prev, shop]
    );
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const newId = onAddCategory(newCategoryName);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setActiveTab(newId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-brand-bg rounded-full">
            <ChevronLeft />
          </button>
          <h2 className="text-xl font-bold">美食库管理</h2>
        </div>
        <button 
          onClick={() => setIsAddingCategory(true)}
          className="p-2 bg-brand-primary/5 text-brand-primary rounded-full hover:bg-brand-primary/10 transition-colors"
          title="新增大类"
        >
          <Plus size={20} />
        </button>
      </div>

      {isAddingCategory && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex flex-col gap-3"
        >
          <h3 className="text-sm font-bold">新增美食大类</h3>
          <div className="flex gap-2">
            <input 
              autoFocus
              type="text" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="如：日料、甜品..."
              className="flex-1 p-2 rounded-lg border-2 border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <button onClick={handleCreateCategory} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold">
              确定
            </button>
            <button onClick={() => setIsAddingCategory(false)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-bold">
              取消
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((c: any) => (
          <button 
            key={c.id}
            onClick={() => {
              setActiveTab(c.id);
              setSelectedShops([]);
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === c.id ? 'bg-brand-primary text-white' : 'bg-white border-2 border-brand-primary/10 text-brand-primary'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between bg-brand-primary/5 p-3 rounded-brand">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">当前分类</span>
          <span className="font-bold text-brand-primary">{currentCategory?.name}</span>
        </div>
        <button 
          onClick={() => {
            if (confirm(`确定要删除“${currentCategory?.name}”大类及其所有美食吗？`)) {
              onDeleteCategory(activeTab);
            }
          }}
          className="p-2 text-red-500 hover:bg-red-50 text-xs font-bold flex items-center gap-1 rounded-lg"
        >
          <Trash2 size={16} />
          删除大类
        </button>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newShop}
          onChange={(e) => setNewShop(e.target.value)}
          placeholder={`在 ${currentCategory?.name} 中添加店名...`}
          className="flex-1 p-3 rounded-brand border-2 border-brand-primary/10 focus:border-brand-primary outline-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAddShop(activeTab, newShop);
              setNewShop('');
            }
          }}
        />
        <button 
          onClick={() => {
            onAddShop(activeTab, newShop);
            setNewShop('');
          }}
          className="p-3 bg-brand-primary text-white rounded-brand"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-400">共 {currentCategory?.shops.length} 家</span>
          <div className="flex gap-2">
            {selectedShops.length > 0 && (
              <button 
                onClick={() => {
                  onBatchDelete(activeTab, selectedShops);
                  setSelectedShops([]);
                }}
                className="text-xs font-bold text-red-500 flex items-center gap-1"
              >
                删除选中 ({selectedShops.length})
              </button>
            )}
            <button 
              onClick={() => onClearCategory(activeTab)}
              className="text-xs font-bold text-red-500 flex items-center gap-1"
            >
              清空全类
            </button>
          </div>
        </div>
        {currentCategory?.shops.map((shop: string) => (
          <div 
            key={shop}
            className={`p-3 rounded-brand border-2 flex items-center justify-between transition-all ${selectedShops.includes(shop) ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-primary/5 bg-white'}`}
          >
            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSelect(shop)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedShops.includes(shop) ? 'bg-brand-primary border-brand-primary' : 'border-brand-primary/20'}`}>
                {selectedShops.includes(shop) && <Check size={14} className="text-white" />}
              </div>
              <span className="text-sm font-medium">{shop}</span>
            </div>
            <button onClick={() => onDeleteShop(activeTab, shop)} className="p-1 text-gray-400 hover:text-red-500">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuestionnaireView({ categories, onBack, onSubmit }: any) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 h-full"
    >
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-brand-bg rounded-full">
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold">智能问卷录入</h2>
      </div>

      <div className="bg-brand-primary/5 p-4 rounded-brand border-2 border-brand-primary/10 text-sm text-brand-primary">
        💡 引导式提问，支持空格分隔多个店名，系统会自动查重哦！
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {categories.map((c: any) => (
          <div key={c.id} className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <span className="bg-brand-primary text-white text-[10px] px-2 py-0.5 rounded-full">{c.name}</span>
              你觉得最好吃的{c.name}是哪几家？
            </label>
            <textarea 
              value={answers[c.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [c.id]: e.target.value }))}
              placeholder="多家店名请用空格分隔..."
              className="w-full p-4 rounded-brand border-2 border-brand-primary/10 focus:border-brand-primary outline-none text-sm min-h-[80px] resize-none"
            />
          </div>
        ))}
      </div>

      <button onClick={() => onSubmit(answers)} className="btn-primary w-full py-4 mt-4">
        完成并同步到库
      </button>
    </motion.div>
  );
}

function SettingsView({ onBack, onExport, onImport, onReset, onDonate }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col gap-6 h-full"
    >
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-brand-bg rounded-full">
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold">系统设置</h2>
      </div>

      <div className="space-y-4">
        <div className="card space-y-4">
          <h3 className="font-bold border-b-2 border-brand-primary/5 pb-2">数据备份与迁移</h3>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={onExport} className="flex items-center justify-between p-4 bg-brand-bg rounded-brand font-bold text-sm">
              <div className="flex items-center gap-3">
                <Download size={20} />
                导出数据备份 (JSON)
              </div>
            </button>
            <label className="flex items-center justify-between p-4 bg-brand-bg rounded-brand font-bold text-sm cursor-pointer">
              <div className="flex items-center gap-3">
                <Upload size={20} />
                导入数据备份
              </div>
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-bold border-b-2 border-brand-primary/5 pb-2">危险区域</h3>
          <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-500 text-red-500 rounded-brand font-bold text-sm">
            <RotateCcw size={20} />
            重置所有数据
          </button>
        </div>

        <div className="card space-y-4">
          <h3 className="font-bold border-b-2 border-brand-primary/5 pb-2">打赏作者</h3>
          <button onClick={onDonate} className="w-full flex items-center justify-between p-4 bg-pink-50 text-pink-600 rounded-brand font-bold text-sm transition-colors hover:bg-pink-100">
            <div className="flex items-center gap-3">
              <Heart size={20} />
              打赏作者
            </div>
            <span className="text-[10px] opacity-60">感谢支持 ❤️</span>
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-8">
          <p>中午吃什么 v1.0.0</p>
          <p>基于浏览器本地存储，治愈系随机美食抽取器</p>
        </div>
      </div>
    </motion.div>
  );
}

function LotteryView({ isSpinning, spinningText, result, onSkip, onBack, onRetry }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-brand-bg flex flex-col items-center justify-center p-6"
    >
      <div className="absolute top-6 left-6">
        <button onClick={onBack} className="p-2 bg-white rounded-full hand-drawn-border shadow-none">
          <ChevronLeft />
        </button>
      </div>

      <div className="w-full max-w-[320px] aspect-square bg-white rounded-full hand-drawn-border flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background animation effect */}
        {isSpinning && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 animate-pulse bg-brand-yellow" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {isSpinning ? (
            <motion.div 
              key="spinning"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-3xl font-black text-brand-primary animate-flash text-center px-4"
            >
              {spinningText}
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center px-4"
            >
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">最终决定是</span>
              <h3 className="text-4xl font-black text-brand-primary leading-tight">{result}</h3>
              <div className="text-4xl mt-2">🎉</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isSpinning && (
        <motion.button 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onSkip}
          className="absolute bottom-10 right-10 w-16 h-16 bg-white rounded-full hand-drawn-border flex items-center justify-center text-sm font-bold text-brand-primary shadow-xl z-50"
        >
          跳过
        </motion.button>
      )}

      {!isSpinning && result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 flex flex-col gap-4 w-full max-w-[280px]"
        >
          <button onClick={onRetry} className="btn-accent w-full py-4 flex items-center justify-center gap-2">
            <RotateCcw size={20} />
            再抽一次
          </button>
          <button onClick={onBack} className="btn-primary w-full py-4 bg-white text-brand-primary border-2 border-brand-primary shadow-none">
            就吃这个了！
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
