/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  MoveHorizontal,
  ClipboardList,
  Star,
  Play,
  CheckCircle,
  AlertCircle,
  Heart,
  Palette,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { Category, FoodData, ThemeType } from './types';
import { INITIAL_CATEGORIES, STORAGE_KEY, THEME_STORAGE_KEY } from './constants';

type View = 'home' | 'manager' | 'rating' | 'questionnaire' | 'settings' | 'lottery';

export default function App() {
  const [data, setData] = useState<FoodData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { categories: INITIAL_CATEGORIES };
  });
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeType) || 'default';
  });
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all' | 'rating'>('all');
  const [ratingFilter, setRatingFilter] = useState<{ type: 'exact' | 'min', value: number | 'unrated' | null }>({
    type: 'exact',
    value: null
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [spinningText, setSpinningText] = useState('');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearRatingsConfirm, setShowClearRatingsConfirm] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleReset = () => {
    // 保留初始的一级分类，但清空所有二级分类（店铺）
    const freshData = INITIAL_CATEGORIES.map(category => ({
      ...category,
      shops: []
    }));
    setData({ categories: freshData });
    setShowResetConfirm(false);
    setCurrentView('home');
    setSelectedCategoryId('all');
  };
  
  const handleClearRatings = () => {
    setData(prev => ({ ...prev, ratings: {} }));
    setShowClearRatingsConfirm(false);
    setFeedback({ type: 'success', message: '所有评分已清空' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const startLottery = () => {
    let pool: string[] = [];
    
    if (selectedCategoryId === 'rating') {
      data.categories.forEach(cat => {
        cat.shops.forEach(shop => {
          const rating = data.ratings?.[`${cat.id}:${shop}`] || 0;
          if (ratingFilter.value === 'unrated') {
            if (rating === 0) pool.push(shop);
          } else if (ratingFilter.value !== null) {
            if (ratingFilter.type === 'exact') {
              if (rating === ratingFilter.value) pool.push(shop);
            } else {
              if (rating >= (ratingFilter.value as number)) pool.push(shop);
            }
          }
        });
      });
    } else {
      pool = selectedCategoryId === 'all' 
        ? data.categories.flatMap(c => c.shops)
        : data.categories.find(c => c.id === selectedCategoryId)?.shops || [];
    }

    if (pool.length === 0) {
      const msg = selectedCategoryId === 'rating'
        ? '哎呀，这个评分下还没有餐厅呢，去评分页面打个分吧！'
        : '库里还没有美食哦，快去添加吧！';
      setFeedback({ type: 'error', message: msg });
      setTimeout(() => setFeedback(null), 3000);
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
      const currentText = pool[randomIndex];
      lastTextRef.current = currentText;
      setSpinningText(currentText);
      count += interval;
      
      if (count >= duration) {
        stopLottery(pool, currentText);
      }
    }, interval);
  };

  const stopLottery = (pool: string[], finalResult?: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Use the provided result, or the last one we saw, or a random one as a last resort
    const resultToSet = finalResult !== undefined ? finalResult : (lastTextRef.current || pool[Math.floor(Math.random() * pool.length)]);
    
    setResult(resultToSet);
    setIsSpinning(false);
  };

  const skipAnimation = () => {
    let pool: string[] = [];
    if (selectedCategoryId === 'rating') {
      data.categories.forEach(cat => {
        cat.shops.forEach(shop => {
          const rating = data.ratings?.[`${cat.id}:${shop}`] || 0;
          if (ratingFilter.value === 'unrated') {
            if (rating === 0) pool.push(shop);
          } else if (ratingFilter.value !== null) {
            if (ratingFilter.type === 'exact') {
              if (rating === ratingFilter.value) pool.push(shop);
            } else {
              if (rating >= (ratingFilter.value as number)) pool.push(shop);
            }
          }
        });
      });
    } else {
      pool = selectedCategoryId === 'all' 
        ? data.categories.flatMap(c => c.shops)
        : data.categories.find(c => c.id === selectedCategoryId)?.shops || [];
    }
    stopLottery(pool, lastTextRef.current);
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
      setFeedback({ type: 'error', message: '至少保留一个分类哦！' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setData(prev => ({
      categories: prev.categories.filter(c => c.id !== id)
    }));
    if (selectedCategoryId === id) setSelectedCategoryId('all');
    setFeedback({ type: 'success', message: '分类已成功删除' });
    setTimeout(() => setFeedback(null), 3000);
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

  const handleMoveShops = (sourceCategoryId: string, targetCategoryId: string, shopNames: string[]) => {
    let duplicateCount = 0;
    let movedCount = 0;
    const duplicates: string[] = [];

    setData(prev => {
      const sourceCat = prev.categories.find(c => c.id === sourceCategoryId);
      const targetCat = prev.categories.find(c => c.id === targetCategoryId);
      
      if (!sourceCat || !targetCat) return prev;

      const newShopsInTarget = shopNames.filter(name => {
        if (targetCat.shops.includes(name)) {
          duplicates.push(name);
          duplicateCount++;
          return false;
        }
        movedCount++;
        return true;
      });

      return {
        ...prev,
        categories: prev.categories.map(c => {
          if (c.id === sourceCategoryId) {
            return { ...c, shops: c.shops.filter(s => !shopNames.includes(s)) };
          }
          if (c.id === targetCategoryId) {
            return { ...c, shops: [...c.shops, ...newShopsInTarget] };
          }
          return c;
        })
      };
    });

    let message = `成功移动 ${movedCount} 家店 (๑•̀ㅂ•́)👍`;
    if (duplicateCount > 0) {
      const uniqueDuplicates = Array.from(new Set(duplicates));
      message += `\n注意：${uniqueDuplicates.slice(0, 3).join('、')}${uniqueDuplicates.length > 3 ? ' 等' : ''}重复店名已自动合并`;
    }
    setFeedback({ type: 'success', message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRateShop = (categoryId: string, shopName: string, rating: number) => {
    setData(prev => {
      const key = `${categoryId}:${shopName}`;
      const currentRating = prev.ratings?.[key] || 0;
      // 如果点击的是当前已有的评分，则重置为 0（未评分）
      const newRating = currentRating === rating ? 0 : rating;
      const newRatings = { ...(prev.ratings || {}), [key]: newRating };
      return { ...prev, ratings: newRatings };
    });
  };

  const handleQuestionnaireSubmit = (answers: Record<string, string>) => {
    let allDuplicates: string[] = [];
    let addedCount = 0;

    const nextCategories = data.categories.map(c => {
      const input = answers[c.id];
      if (!input || !input.trim()) return c;
      
      const rawInputs = input.split(/\s+/).map(s => s.trim()).filter(Boolean);
      const seenInInput = new Set<string>();
      const duplicatesInInput: string[] = [];
      
      rawInputs.forEach(s => {
        if (seenInInput.has(s)) {
          duplicatesInInput.push(s);
        } else {
          seenInInput.add(s);
        }
      });

      const uniqueFromInput = Array.from(seenInInput);
      const alreadyExists = uniqueFromInput.filter(s => c.shops.includes(s));
      const trulyNew = uniqueFromInput.filter(s => !c.shops.includes(s));

      if (duplicatesInInput.length > 0 || alreadyExists.length > 0) {
        allDuplicates = [...allDuplicates, ...duplicatesInInput, ...alreadyExists];
      }

      addedCount += trulyNew.length;
      return { ...c, shops: [...c.shops, ...trulyNew] };
    });

    setData({ ...data, categories: nextCategories });

    let message = `已成功添加 ${addedCount} 家店 (๑•̀ㅂ•́)👍`;
    if (allDuplicates.length > 0) {
      const uniqueDuplicates = Array.from(new Set(allDuplicates));
      // 限制显示数量，防止提示框过长
      const displayLimit = 5;
      const displayDuplicates = uniqueDuplicates.slice(0, displayLimit);
      const moreCount = uniqueDuplicates.length - displayLimit;
      
      message += `\n注意：${displayDuplicates.join('、')}${moreCount > 0 ? ` 等 ${uniqueDuplicates.length} 项` : ''}重复已自动合并`;
    }

    setFeedback({ type: 'success', message });
    setCurrentView('home');
    setTimeout(() => setFeedback(null), 5000);
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
        if (imported.categories && Array.isArray(imported.categories)) {
          setData(prev => {
            const currentCategories = [...prev.categories];
            
            imported.categories.forEach((impCat: Category) => {
              const existingIndex = currentCategories.findIndex(c => c.name === impCat.name);
              
              if (existingIndex !== -1) {
                // 存在相同大类，合并小类（去重）
                const existingCat = currentCategories[existingIndex];
                const mergedShops = Array.from(new Set([...existingCat.shops, ...impCat.shops]));
                currentCategories[existingIndex] = {
                  ...existingCat,
                  shops: mergedShops
                };
              } else {
                // 不存在的大类，直接新增
                // 为防止 ID 冲突，重新生成一个 ID
                currentCategories.push({
                  ...impCat,
                  id: 'cat_' + Math.random().toString(36).substr(2, 9) + Date.now()
                });
              }
            });
            
            return { 
              ...prev,
              categories: currentCategories,
              ratings: { ...(prev.ratings || {}), ...(imported.ratings || {}) }
            };
          });
          setFeedback({ type: 'success', message: '数据合并导入成功！' });
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        setFeedback({ type: 'error', message: '导入失败，请检查文件格式。' });
      } finally {
        e.target.value = '';
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
                ratingFilter={ratingFilter}
                onSelect={setSelectedCategoryId}
                onRatingFilterChange={setRatingFilter}
                onStart={startLottery}
                onGoToManager={() => setCurrentView('manager')}
                onGoToRating={() => setCurrentView('rating')}
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
                onMoveShops={handleMoveShops}
              />
            )}
            {currentView === 'rating' && (
              <RatingView 
                categories={data.categories}
                ratings={data.ratings}
                onRate={handleRateShop}
                onBack={() => setCurrentView('home')}
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
                onClearRatings={() => setShowClearRatingsConfirm(true)}
                onDonate={() => setShowDonation(true)}
                currentTheme={theme}
                onThemeChange={setTheme}
              />
            )}
            {currentView === 'lottery' && (
              <LotteryView 
                isSpinning={isSpinning}
                spinningText={spinningText}
                result={result}
                categories={data.categories}
                ratings={data.ratings}
                onSkip={skipAnimation}
                onBack={() => setCurrentView('home')}
                onRetry={startLottery}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Footer Navigation (only on some views) */}
        {['home', 'manager', 'rating', 'questionnaire'].includes(currentView) && (
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
              onClick={() => setCurrentView('rating')}
              className={`flex flex-col items-center gap-1 ${currentView === 'rating' ? 'text-brand-primary' : 'text-gray-400'}`}
            >
              <Star size={24} />
              <span className="text-xs font-bold">评分</span>
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
          {showClearRatingsConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-[300px] rounded-3xl p-6 hand-drawn-border shadow-2xl space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold">清空评分？</h3>
                  <p className="text-gray-500 text-sm">确定要清空所有店铺的评分吗？此操作不可撤销。</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleClearRatings}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    确定清空
                  </button>
                  <button 
                    onClick={() => setShowClearRatingsConfirm(false)}
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
                <span className="font-bold text-sm whitespace-pre-wrap">{feedback.message}</span>
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
                  <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100 flex flex-col items-center justify-center min-h-[240px]">
                    {/* 提示：请将您的二维码图片上传到 public 文件夹，并命名为 qr-code.png */}
                    <img 
                      src="/qr-code.png" 
                      alt="打赏二维码" 
                      className="w-48 h-48 object-contain mb-4"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // 如果图片加载失败（例如文件还没上传），显示备用文字
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'text-center p-4 text-brand-primary font-bold';
                          fallback.innerHTML = '请上传二维码图片<br/><span class="text-[10px] font-normal text-gray-400">文件名需为 qr-code.png</span>';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                    <p className="text-sm font-bold text-brand-primary">长按或扫码打赏</p>
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

function HomeView({ categories, selectedId, ratingFilter, onSelect, onRatingFilterChange, onStart, onGoToManager, onGoToRating, onGoToQuestionnaire }: any) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
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
        <p className="text-gray-500 text-sm">拆个美食盲盒吧，看看今天和哪家餐厅最有缘！</p>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-bold text-brand-primary/60 uppercase tracking-wider">选择范围</label>
        <div className="grid grid-cols-2 gap-3 relative">
          {/* Option 1: All */}
          <button 
            onClick={() => {
              onSelect('all');
              setIsDropdownOpen(false);
              setIsRatingOpen(false);
            }}
            className={`p-4 h-28 rounded-brand border-2 transition-all font-bold flex flex-col items-center justify-center gap-2 ${selectedId === 'all' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 bg-white text-brand-primary hover:border-brand-primary/30'}`}
          >
            <div className="text-2xl">🌍</div>
            <span>全库抽奖</span>
          </button>

          {/* Option 2: Selectable */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setIsRatingOpen(false);
              }}
              className={`w-full h-28 p-4 rounded-brand border-2 transition-all font-bold flex flex-col items-center justify-center gap-2 ${(!['all', 'rating'].includes(selectedId)) ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 bg-white text-brand-primary hover:border-brand-primary/30'}`}
            >
              <div className="text-2xl">🍱</div>
              <span className="truncate w-full text-center text-sm">
                {(!['all', 'rating'].includes(selectedId)) ? selectedCategory?.name : '指定分类'}
              </span>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
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

          {/* Option 3: Rating (New) */}
          <div className="col-span-2 relative">
            <button 
              onClick={() => {
                setIsRatingOpen(!isRatingOpen);
                setIsDropdownOpen(false);
              }}
              className={`w-full p-4 rounded-brand border-2 transition-all font-bold flex items-center justify-center gap-4 ${selectedId === 'rating' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/10 bg-white text-brand-primary hover:border-brand-primary/30'}`}
            >
              <div className="text-2xl">⭐</div>
              <div className="flex flex-col items-start">
                <span className="text-sm">按评分抽取</span>
                {selectedId === 'rating' && ratingFilter.value !== null && (
                  <span className="text-[10px] opacity-80 font-normal">
                    {ratingFilter.value === 'unrated' ? '未评分' : `${ratingFilter.type === 'exact' ? '精确' : '大于'} ${ratingFilter.value} 星`}
                  </span>
                )}
              </div>
            </button>

            <AnimatePresence>
              {isRatingOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsRatingOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white hand-drawn-border z-20 p-4 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">筛选模式</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onRatingFilterChange({ ...ratingFilter, type: 'min' })}
                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${ratingFilter.type === 'min' ? 'bg-brand-primary text-white' : 'bg-brand-primary/5 text-gray-400'}`}
                        >
                          大于星级
                        </button>
                        <button 
                          onClick={() => onRatingFilterChange({ ...ratingFilter, type: 'exact' })}
                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${ratingFilter.type === 'exact' ? 'bg-brand-primary text-white' : 'bg-brand-primary/5 text-gray-400'}`}
                        >
                          精确匹配
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => {
                          onRatingFilterChange({ ...ratingFilter, value: 'unrated' });
                          onSelect('rating');
                          setIsRatingOpen(false);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${ratingFilter.value === 'unrated' && selectedId === 'rating' ? 'bg-brand-primary text-white' : 'bg-brand-primary/5 text-brand-primary'}`}
                      >
                        未评分
                      </button>
                      {[1, 2, 3, 4, 5].map(val => (
                        <button 
                          key={val}
                          onClick={() => {
                            onRatingFilterChange({ ...ratingFilter, value: val });
                            onSelect('rating');
                            setIsRatingOpen(false);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${ratingFilter.value === val && selectedId === 'rating' ? 'bg-brand-primary text-white' : 'bg-brand-primary/5 text-brand-primary'}`}
                        >
                          {val} <Star size={10} fill={ratingFilter.value === val && selectedId === 'rating' ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
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
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button onClick={onGoToManager} className="btn-primary flex-1 py-4 text-sm bg-brand-bg text-brand-primary border-2 border-brand-primary shadow-none">
              手动管理
            </button>
            <button onClick={onGoToRating} className="btn-primary flex-1 py-4 text-sm bg-brand-bg text-brand-primary border-2 border-brand-primary shadow-none">
              美食评分
            </button>
          </div>
          <button onClick={onGoToQuestionnaire} className="btn-primary w-full py-4 text-sm bg-brand-bg text-brand-primary border-2 border-brand-primary shadow-none">
            智能问卷录入
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ManagerView({ categories, onBack, onAddShop, onDeleteShop, onBatchDelete, onClearCategory, onAddCategory, onDeleteCategory, onMoveShops }: any) {
  const [activeTab, setActiveTab] = useState(categories[0]?.id);
  const [newShop, setNewShop] = useState('');
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
    setDragMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    if (Math.abs(walk) > 5) {
      setDragMoved(true);
      scrollRef.current.scrollLeft = scrollLeftState - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const currentCategory = categories.find((c: any) => c.id === activeTab);

  const allShops = useMemo(() => {
    const shops: { name: string; categoryName: string }[] = [];
    categories.forEach((cat: any) => {
      // Reverse shops within category to get newest first
      const reversedShops = [...cat.shops].reverse();
      reversedShops.forEach((shop: string) => {
        shops.push({ name: shop, categoryName: cat.name });
      });
    });
    return shops;
  }, [categories]);

  const suggestions = useMemo(() => {
    const trimmed = newShop.trim().toLowerCase();
    if (!trimmed) return [];
    return allShops.filter(s => s.name.toLowerCase().includes(trimmed));
  }, [newShop, allShops]);

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

      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`flex gap-2 overflow-x-auto pb-2 custom-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {categories.map((c: any) => (
          <button 
            key={c.id}
            onClick={() => {
              if (dragMoved) return;
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
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-red-500 hover:bg-red-50 text-xs font-bold flex items-center gap-1 rounded-lg"
        >
          <Trash2 size={16} />
          删除大类
        </button>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-[300px] rounded-3xl p-6 hand-drawn-border shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold">删除大类？</h3>
                <p className="text-gray-500 text-sm">确定要删除“{currentCategory?.name}”大类及其所有美食吗？此操作不可撤销。</p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    onDeleteCategory(activeTab);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  确定删除
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showMoveMenu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-[300px] rounded-3xl p-6 hand-drawn-border shadow-2xl space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-primary/5 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-2">
                  <MoveHorizontal size={32} />
                </div>
                <h3 className="text-xl font-bold">移动到其他分类</h3>
                <p className="text-gray-500 text-sm">请选择目标分类：</p>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 p-1 custom-scrollbar">
                {categories.filter((c: any) => c.id !== activeTab).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onMoveShops(activeTab, c.id, selectedShops);
                      setSelectedShops([]);
                      setShowMoveMenu(false);
                    }}
                    className="w-full text-left p-4 rounded-xl border-2 border-brand-primary/5 hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-sm font-bold flex items-center justify-between group"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-brand-primary">({c.shops.length})</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowMoveMenu(false)}
                className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative">
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

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full mt-1 bg-white hand-drawn-border z-30 max-h-48 overflow-y-auto shadow-xl p-1"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.name}-${s.categoryName}-${idx}`}
                  onClick={() => {
                    setNewShop(s.name);
                  }}
                  className="w-full text-left p-2 hover:bg-brand-bg rounded-lg text-xs font-medium flex justify-between items-center group"
                >
                  <span className="text-brand-primary">{s.name}</span>
                  <span className="text-gray-400 group-hover:text-brand-primary/60"> - {s.categoryName}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-400">共 {currentCategory?.shops.length} 家</span>
          <div className="flex gap-3">
            {selectedShops.length > 0 && (
              <>
                <button 
                  onClick={() => setShowMoveMenu(true)}
                  className="text-xs font-bold text-red-500 flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <MoveHorizontal size={14} />
                  移动分类
                </button>
                <button 
                  onClick={() => {
                    onBatchDelete(activeTab, selectedShops);
                    setSelectedShops([]);
                  }}
                  className="text-xs font-bold text-red-500 flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <Trash2 size={14} />
                  删除选中 ({selectedShops.length})
                </button>
              </>
            )}
            <button 
              onClick={() => onClearCategory(activeTab)}
              className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              清空全类
            </button>
          </div>
        </div>
        {[...(currentCategory?.shops || [])].reverse().map((shop: string) => (
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

function SettingsView({ onBack, onExport, onImport, onReset, onClearRatings, onDonate, currentTheme, onThemeChange }: any) {
  const themes = [
    { id: 'default', name: '经典靛蓝', primary: '#1A237E', bg: '#E3F2FD' },
    { id: 'blue', name: '清新海洋', primary: '#0277BD', bg: '#E1F5FE' },
    { id: 'pink', name: '浪漫樱粉', primary: '#C2185B', bg: '#FCE4EC' },
  ];

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
          <h3 className="font-bold border-b-2 border-brand-primary/5 pb-2 flex items-center gap-2">
            <Palette size={18} />
            个性化主题
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                  currentTheme === t.id ? 'border-brand-primary bg-brand-primary/5' : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: t.bg }}
                >
                  <div className="w-full h-1/2 absolute bottom-0" style={{ backgroundColor: t.primary }} />
                  {currentTheme === t.id && <Check size={20} className="text-white z-10 drop-shadow-md" />}
                </div>
                <span className={`text-[10px] font-bold ${currentTheme === t.id ? 'text-brand-primary' : 'text-gray-500'}`}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>

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
          <div className="space-y-3">
            <button onClick={onClearRatings} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-500 text-red-500 rounded-brand font-bold text-sm">
              <Trash2 size={20} />
              清空所有评分
            </button>
            <button onClick={onReset} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-500 text-red-500 rounded-brand font-bold text-sm">
              <RotateCcw size={20} />
              重置所有数据
            </button>
          </div>
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
          <p>世界上最遥远的距离，是‘随便’到‘决定’的距离。</p>
        </div>
      </div>
    </motion.div>
  );
}

function LotteryView({ isSpinning, spinningText, result, categories, ratings, onSkip, onBack, onRetry }: any) {
  const resultRating = useMemo(() => {
    if (!result || isSpinning) return null;
    for (const cat of categories) {
      if (cat.shops.includes(result)) {
        return ratings?.[`${cat.id}:${result}`] || 0;
      }
    }
    return 0;
  }, [result, isSpinning, categories, ratings]);

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
              {resultRating !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {resultRating > 0 ? (
                    <>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={star <= resultRating ? 'text-yellow-400' : 'text-gray-200'}
                          fill={star <= resultRating ? "currentColor" : "none"}
                        />
                      ))}
                      <span className="text-[10px] font-bold text-brand-primary/60 ml-1">{resultRating} 分</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">未评分</span>
                  )}
                </div>
              )}
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

function RatingView({ categories, ratings, onRate, onBack }: any) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'exact' | 'min'>('exact');
  const [filterValue, setFilterValue] = useState<number | null>(null);

  const allShops = useMemo(() => {
    const shops: { categoryId: string; categoryName: string; name: string; rating: number }[] = [];
    categories.forEach((cat: any) => {
      cat.shops.forEach((shop: string) => {
        const rating = ratings?.[`${cat.id}:${shop}`] || 0;
        shops.push({ categoryId: cat.id, categoryName: cat.name, name: shop, rating });
      });
    });
    return shops;
  }, [categories, ratings]);

  const filteredShops = useMemo(() => {
    return allShops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      if (filterValue === null) return true;
      
      if (filterType === 'exact') {
        return shop.rating === filterValue;
      } else {
        return shop.rating >= filterValue;
      }
    });
  }, [allShops, search, filterType, filterValue]);

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
          <h2 className="text-xl font-bold">美食评分</h2>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索美食名称..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-primary/10 focus:border-brand-primary outline-none text-sm transition-all"
          />
        </div>

        <div className="flex flex-col gap-2 p-4 bg-brand-primary/5 rounded-2xl border-2 border-brand-primary/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Filter size={14} />
              筛选星级
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterType('min')}
                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${filterType === 'min' ? 'bg-brand-primary text-white' : 'bg-white text-gray-400'}`}
              >
                大于星级
              </button>
              <button 
                onClick={() => setFilterType('exact')}
                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${filterType === 'exact' ? 'bg-brand-primary text-white' : 'bg-white text-gray-400'}`}
              >
                精确匹配
              </button>
            </div>
          </div>
          <div className="flex justify-between gap-1">
            <button 
              onClick={() => setFilterValue(null)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filterValue === null ? 'bg-brand-primary text-white' : 'bg-white text-brand-primary border border-brand-primary/10'}`}
            >
              全部
            </button>
            {[1, 2, 3, 4, 5].map(val => (
              <button 
                key={val}
                onClick={() => setFilterValue(val)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filterValue === val ? 'bg-brand-primary text-white' : 'bg-white text-brand-primary border border-brand-primary/10'}`}
              >
                {val} <Star size={10} fill={filterValue === val ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {filteredShops.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Star size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm">没有找到符合条件的美食哦</p>
          </div>
        ) : (
          filteredShops.map((shop, idx) => (
            <div key={`${shop.categoryId}-${shop.name}-${idx}`} className="card p-4 flex flex-col gap-3 group hover:border-brand-primary transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-brand-primary">{shop.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{shop.categoryName}</p>
                </div>
                <div className="text-xs font-black text-brand-primary bg-brand-primary/5 px-2 py-1 rounded-lg">
                  {shop.rating > 0 ? `${shop.rating} 分` : '未评分'}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => onRate(shop.categoryId, shop.name, star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        size={24} 
                        className={`${star <= shop.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill={star <= shop.rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-gray-400 ml-2">
                  {shop.rating === 1 && '差评 / 不满意'}
                  {shop.rating === 2 && '一般'}
                  {shop.rating === 3 && '满意 / 中评'}
                  {shop.rating === 4 && '非常满意 / 好评'}
                  {shop.rating === 5 && '强烈推荐 / 满分'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
