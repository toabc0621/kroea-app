'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    L: any;
  }
}

// Supabaseクライアントの初期化（環境変数を使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ItineraryItem = {
  id: string;
  day: number;
  time: string;
  title: string;
  category: string;
  memo: string;
};

type TodoItem = {
  id: string;
  task: string;
  assignees: string[];
  is_completed: boolean;
  created_at: string;
};

type ExpenseItem = {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  category: string;
};

type MapSpotItem = {
  id: string;
  nameJa: string;
  nameKo: string;
  addressKo: string;
  category: '拠点' | 'レストラン' | 'カフェ' | 'ショッピング' | '夜系' | 'クラブ' | '両替所' | '観光地';
  memo?: string;
  lat: number;
  lng: number;
};

const MEMBERS = ['たいき', 'ハル', 'シオン', 'ミサト', 'けいしゅう', 'りゅうせい'];
const MAP_CATEGORIES = ['すべて', '拠点', 'レストラン', 'カフェ', 'ショッピング', '夜系', 'クラブ', '両替所', '観光地'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  '拠点': '#3b82f6',
  'レストラン': '#ef4444',
  'カフェ': '#f59e0b',
  'ショッピング': '#a855f7',
  '夜系': '#ec4899',
  'クラブ': '#6366f1',
  '両替所': '#10b981',
  '観光地': '#f97316',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'todo' | 'expenses' | 'map'>('map');

  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [newDay, setNewDay] = useState(1);
  const [newTime, setNewTime] = useState('10:00');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('観光');
  const [newMemo, setNewMemo] = useState('');
  const [timelineSort, setTimelineSort] = useState<'day-asc' | 'time-asc'>('day-asc');

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newAssignees, setNewAssignees] = useState<string[]>(['たいき']);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('全員');
  const [todoSort, setTodoSort] = useState<'newest' | 'oldest' | 'incomplete'>('newest');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpensePaidBy, setNewExpensePaidBy] = useState('たいき');
  const [newExpenseCategory, setNewExpenseCategory] = useState('食事');
  const [showCalculationDetails, setShowCalculationDetails] = useState(true);

  const [mapSpots, setMapSpots] = useState<MapSpotItem[]>([]);
  const [freeQuery, setFreeQuery] = useState('');
  const [newSpotNameJa, setNewSpotNameJa] = useState('');
  const [newSpotNameKo, setNewSpotNameKo] = useState('');
  const [newSpotAddressKo, setNewSpotAddressKo] = useState('');
  const [newSpotCategory, setNewSpotCategory] = useState<'拠点' | 'レストラン' | 'カフェ' | 'ショッピング' | '夜系' | 'クラブ' | '両替所' | '観光地'>('観光地');
  const [newSpotMemo, setNewSpotMemo] = useState('');
  const [newSpotLat, setNewSpotLat] = useState('37.5796');
  const [newSpotLng, setNewSpotLng] = useState('126.9770');
  const [selectedMapCategory, setSelectedMapCategory] = useState<string>('すべて');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // --- Supabaseからのデータフェッチ ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. 旅程取得
    const { data: itData } = await supabase.from('itineraries').select('*');
    if (itData) setItineraries(itData);

    // 2. TODO取得
    const { data: todoData } = await supabase.from('todos').select('*');
    if (todoData) {
      setTodos(todoData.map((t: any) => ({
        id: t.id,
        task: t.task,
        assignees: t.assignees,
        is_completed: t.is_completed,
        created_at: t.created_at
      })));
    }

    // 3. 費用取得
    const { data: expData } = await supabase.from('expenses').select('*');
    if (expData) {
      setExpenses(expData.map((e: any) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        paidBy: e.paid_by,
        category: e.category
      })));
    }

    // 4. マップスポット取得
    const { data: mapData } = await supabase.from('map_spots').select('*');
    if (mapData) {
      setMapSpots(mapData.map((m: any) => ({
        id: m.id,
        nameJa: m.name_ja,
        nameKo: m.name_ko,
        addressKo: m.address_ko,
        category: m.category,
        memo: m.memo,
        lat: m.lat,
        lng: m.lng
      })));
    }
  };

  // 緯度経度の自動取得
  const handleAutoGeocode = async () => {
    let searchQuery = newSpotNameKo || newSpotAddressKo || newSpotNameJa;
    if (!searchQuery) {
      alert('スポット名または韓国語名称・住所を入力してください');
      return;
    }

    setIsGeocoding(true);
    try {
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      let data = await res.json();

      if ((!data || data.length === 0) && newSpotAddressKo) {
        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newSpotAddressKo)}`);
        data = await res.json();
      }

      if (data && data.length > 0) {
        setNewSpotLat(data[0].lat);
        setNewSpotLng(data[0].lon);
        alert(`座標を取得しました！\n緯度: ${data[0].lat}, 経度: ${data[0].lon}`);
      } else {
        alert('該当する場所が見つかりませんでした。');
      }
    } catch (err) {
      console.error(err);
      alert('ジオコーディングの取得に失敗しました。');
    } finally {
      setIsGeocoding(false);
    }
  };

  // 現在地を取得してマップを移動する関数
  const handleShowCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('お使いの端末・ブラウザでは現在地の取得がサポートされていません。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15);
        }
      },
      (error) => {
        console.error('Geolocation Error:', error);
        alert('現在地を取得できませんでした。端末の位置情報サービスがオンになっているか確認してください。');
      },
      { enableHighAccuracy: true }
    );
  };

  // Leafletマップの初期化
  useEffect(() => {
    if (activeTab !== 'map') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMap();
        document.body.appendChild(script);
      }
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, mapSpots, selectedMapCategory, currentLocation]);

  const initMap = () => {
    if (!window.L || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const filtered = mapSpots.filter(spot => {
      if (selectedMapCategory === 'すべて') return true;
      return spot.category === selectedMapCategory;
    });

    const centerLat = currentLocation ? currentLocation.lat : (filtered.length > 0 ? filtered[0].lat : 37.5665);
    const centerLng = currentLocation ? currentLocation.lng : (filtered.length > 0 ? filtered[0].lng : 126.9780);
    const zoomLevel = currentLocation ? 15 : 13;

    const map = window.L.map(mapRef.current).setView([centerLat, centerLng], zoomLevel);
    mapInstanceRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    filtered.forEach(spot => {
      const color = CATEGORY_COLORS[spot.category] || '#3b82f6';
      
      const customIcon = window.L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11]
      });

      const marker = window.L.marker([spot.lat, spot.lng], { icon: customIcon }).addTo(map);
      // 韓国語名称、または韓国語住所をキーにしてNAVER Map検索
      const searchKey = spot.nameKo || spot.addressKo || spot.nameJa;
      const naverSearchUrl = `https://map.naver.com/p/search/${encodeURIComponent(searchKey)}`;
      
      marker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="font-size: 14px; color: #111;">${spot.nameJa}</strong><br/>
          ${spot.nameKo ? `<span style="color: #4b5563; font-size: 12px; font-weight: bold;">韓国語名: ${spot.nameKo}</span><br/>` : ''}
          ${spot.addressKo ? `<span style="color: #6b7280; font-size: 11px;">住所: ${spot.addressKo}</span><br/>` : ''}
          ${spot.memo ? `<span style="color: #374151; font-size: 11px;">メモ: ${spot.memo}</span><br/>` : ''}
          <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 6px; font-size: 10px; display: inline-block; margin: 4px 0; font-weight: bold;">${spot.category}</span><br/>
          <a href="${naverSearchUrl}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">NAVER Mapで開く</a>
        </div>
      `);
    });

    if (currentLocation) {
      const currentLocationIcon = window.L.divIcon({
        className: 'current-location-pin',
        html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      window.L.marker([currentLocation.lat, currentLocation.lng], { 
        icon: currentLocationIcon, 
        zIndexOffset: 1000 
      })
      .addTo(map)
      .bindPopup('<div style="font-weight:bold; font-size:12px;">現在地</div>');
    }
  };

  // --- 旅程追加（Supabase連携） ---
  const handleAddItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newItem = {
      day: Number(newDay),
      time: newTime,
      title: newTitle,
      category: newCategory,
      memo: newMemo,
    };

    const { data, error } = await supabase.from('itineraries').insert([newItem]).select();
    if (error) {
      console.error(error);
      alert('追加に失敗しました');
      return;
    }

    if (data) {
      setItineraries([...itineraries, data[0]]);
      setNewTitle('');
      setNewMemo('');
    }
  };

  const deleteItinerary = async (id: string) => {
    const { error } = await supabase.from('itineraries').delete().eq('id', id);
    if (!error) {
      setItineraries(itineraries.filter(i => i.id !== id));
    }
  };

  // --- TODO追加・更新（Supabase連携） ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText || newAssignees.length === 0) return;

    const newTodo = {
      task: newTaskText,
      assignees: newAssignees,
      is_completed: false,
    };

    const { data, error } = await supabase.from('todos').insert([newTodo]).select();
    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setTodos([...todos, data[0]]);
      setNewTaskText('');
      setNewAssignees(['たいき']);
    }
  };

  const toggleTodoComplete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('todos').update({ is_completed: !currentStatus }).eq('id', id);
    if (!error) {
      setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (!error) {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const handleAssigneeToggle = (member: string) => {
    if (newAssignees.includes(member)) {
      setNewAssignees(newAssignees.filter(m => m !== member));
    } else {
      setNewAssignees([...newAssignees, member]);
    }
  };

  // --- 費用追加（Supabase連携） ---
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseTitle || !newExpenseAmount) return;

    const newExp = {
      title: newExpenseTitle,
      amount: Number(newExpenseAmount),
      paid_by: newExpensePaidBy,
      category: newExpenseCategory,
    };

    const { data, error } = await supabase.from('expenses').insert([newExp]).select();
    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setExpenses([...expenses, {
        id: data[0].id,
        title: data[0].title,
        amount: data[0].amount,
        paidBy: data[0].paid_by,
        category: data[0].category,
      }]);
      setNewExpenseTitle('');
      setNewExpenseAmount('');
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const calculateSettlements = () => {
    const numMembers = MEMBERS.length;
    if (numMembers === 0 || totalExpense === 0) return { fairShare: 0, settlements: [], memberBalances: [] };

    const fairShare = totalExpense / numMembers;

    const memberBalances = MEMBERS.map(m => {
      const paid = expenses.filter(e => e.paidBy === m).reduce((sum, e) => sum + e.amount, 0);
      const balance = paid - fairShare;
      return { member: m, paid, balance };
    });

    const debtors = memberBalances.filter(m => m.balance < -0.1).map(m => ({ name: m.member, amount: -m.balance }));
    const creditors = memberBalances.filter(m => m.balance > 0.1).map(m => ({ name: m.member, amount: m.balance }));

    const settlements: { from: string; to: string; amount: number }[] = [];

    let d = 0;
    let c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0) {
        settlements.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount) });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.1) d++;
      if (creditor.amount < 0.1) c++;
    }

    return { fairShare, settlements, memberBalances };
  };

  const { fairShare, settlements, memberBalances } = calculateSettlements();

  // --- NAVER Mapスポット追加・編集（Supabase連携） ---
  const handleSaveMapSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpotNameJa && !newSpotNameKo) return;

    const spotData = {
      name_ja: newSpotNameJa || newSpotNameKo,
      name_ko: newSpotNameKo,
      address_ko: newSpotAddressKo,
      category: newSpotCategory,
      memo: newSpotMemo,
      lat: Number(newSpotLat) || 37.5665,
      lng: Number(newSpotLng) || 126.9780,
    };

    if (editingSpotId) {
      // 編集（更新）
      const { error } = await supabase
        .from('map_spots')
        .update(spotData)
        .eq('id', editingSpotId);

      if (error) {
        console.error(error);
        alert('スポットの更新に失敗しました');
        return;
      }

      setMapSpots(mapSpots.map(s => s.id === editingSpotId ? {
        id: editingSpotId,
        nameJa: spotData.name_ja,
        nameKo: spotData.name_ko,
        addressKo: spotData.address_ko,
        category: spotData.category,
        memo: spotData.memo,
        lat: spotData.lat,
        lng: spotData.lng,
      } : s));

      setEditingSpotId(null);
      setNewSpotNameJa('');
      setNewSpotNameKo('');
      setNewSpotAddressKo('');
      setNewSpotMemo('');
      alert('スポットを更新しました！');
    } else {
      // 新規追加
      const { data, error } = await supabase.from('map_spots').insert([spotData]).select();
      if (error) {
        console.error(error);
        alert('スポットの追加に失敗しました');
        return;
      }

      if (data) {
        setMapSpots([...mapSpots, {
          id: data[0].id,
          nameJa: data[0].name_ja,
          nameKo: data[0].name_ko,
          addressKo: data[0].address_ko,
          category: data[0].category,
          memo: data[0].memo,
          lat: data[0].lat,
          lng: data[0].lng,
        }]);
        setNewSpotNameJa('');
        setNewSpotNameKo('');
        setNewSpotAddressKo('');
        setNewSpotMemo('');
      }
    }
  };

  const handleStartEditMapSpot = (spot: MapSpotItem) => {
    setEditingSpotId(spot.id);
    setNewSpotNameJa(spot.nameJa);
    setNewSpotNameKo(spot.nameKo || '');
    setNewSpotAddressKo(spot.addressKo || '');
    setNewSpotCategory(spot.category);
    setNewSpotMemo(spot.memo || '');
    setNewSpotLat(String(spot.lat));
    setNewSpotLng(String(spot.lng));
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSpotId(null);
    setNewSpotNameJa('');
    setNewSpotNameKo('');
    setNewSpotAddressKo('');
    setNewSpotMemo('');
    setNewSpotLat('37.5796');
    setNewSpotLng('126.9770');
  };

  const deleteMapSpot = async (id: string) => {
    const { error } = await supabase.from('map_spots').delete().eq('id', id);
    if (!error) {
      setMapSpots(mapSpots.filter(s => s.id !== id));
      if (editingSpotId === id) {
        handleCancelEdit();
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}「${text}」をコピーしました！`);
  };

  const handleFreeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeQuery) return;
    window.open(`https://map.naver.com/p/search/${encodeURIComponent(freeQuery)}`, '_blank');
  };

  const filteredTodos = todos.filter(t => {
    if (selectedMemberFilter === '全員') return true;
    return t.assignees.includes(selectedMemberFilter);
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (todoSort === 'newest') return b.id.localeCompare(a.id);
    if (todoSort === 'oldest') return a.id.localeCompare(b.id);
    if (todoSort === 'incomplete') return (a.is_completed === b.is_completed) ? 0 : a.is_completed ? 1 : -1;
    return 0;
  });

  const sortedItineraries = [...itineraries].sort((a, b) => {
    if (timelineSort === 'day-asc') {
      if (a.day !== b.day) return a.day - b.day;
      return a.time.localeCompare(b.time);
    } else {
      return a.time.localeCompare(b.time);
    }
  });

  const filteredMapSpots = mapSpots.filter(spot => {
    if (selectedMapCategory === 'すべて') return true;
    return spot.category === selectedMapCategory;
  });

  return (
    <main className="min-h-dvh bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 text-slate-800 relative overflow-hidden pb-16">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-pink-200/30 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full px-4 sm:px-8 py-8 relative z-10 space-y-6">
        
        {/* ナビゲーションタブ */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/80 p-1.5 rounded-3xl shadow-xl shadow-slate-900/5 flex gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'timeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            旅程タイムライン
          </button>
          <button
            onClick={() => setActiveTab('todo')}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'todo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            TODOリスト <span className="text-xs opacity-80">({todos.filter(t => !t.is_completed).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'expenses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            費用・立替
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            NAVER Map
          </button>
        </div>

        {/* 1. 旅程タイムライン */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">旅程タイムライン</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">並び替え:</span>
                <select
                  className="bg-white/70 backdrop-blur-md border border-white/60 p-2 rounded-xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={timelineSort}
                  onChange={(e) => setTimelineSort(e.target.value as 'day-asc' | 'time-asc')}
                >
                  <option value="day-asc">日程・時間順</option>
                  <option value="time-asc">時間のみ順</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleAddItinerary} className="bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-900/5 grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">日数</label>
                <select 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                >
                  <option value={1}>Day 1 (9/24)</option>
                  <option value={2}>Day 2 (9/25)</option>
                  <option value={3}>Day 3 (9/26)</option>
                  <option value={4}>Day 4 (9/27)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">時間</label>
                <input 
                  type="time" 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">スポット・予定名</label>
                <input 
                  type="text" 
                  placeholder="例: 景福宮" 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">カテゴリ</label>
                <select 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="観光">観光</option>
                  <option value="食事">食事</option>
                  <option value="カフェ・デザート">カフェ・デザート</option>
                  <option value="ショッピング">ショッピング</option>
                  <option value="美容・サロン">美容・サロン</option>
                  <option value="宿泊・ホテル">宿泊・ホテル</option>
                  <option value="移動">移動</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">メモ・詳細</label>
                <input 
                  type="text" 
                  placeholder="例: 最寄り駅や予約情報など" 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]">
                  追加する
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {sortedItineraries.map((item) => (
                <div key={item.id} className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl shadow-xl shadow-slate-900/5 p-6 flex justify-between items-start transition-all hover:bg-white/80">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                        Day {item.day}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200/55 px-2.5 py-1 rounded-lg">
                        {item.time}
                      </span>
                      <span className="text-xs font-medium text-slate-500 border border-slate-200/60 px-2.5 py-0.5 rounded-lg">
                        {item.category}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                    {item.memo && <p className="text-slate-600 text-sm">{item.memo}</p>}
                  </div>
                  <button 
                    onClick={() => deleteItinerary(item.id)}
                    className="text-rose-500 text-xs font-medium hover:underline pt-1"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. TODOリスト */}
        {activeTab === 'todo' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">TODOリスト (6人管理)</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">並び替え:</span>
                <select
                  className="bg-white/70 backdrop-blur-md border border-white/60 p-2 rounded-xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={todoSort}
                  onChange={(e) => setTodoSort(e.target.value as 'newest' | 'oldest' | 'incomplete')}
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="incomplete">未完了優先</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-3xl shadow-xl shadow-slate-900/5">
              <button
                onClick={() => setSelectedMemberFilter('全員')}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                  selectedMemberFilter === '全員' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                全員 ({todos.length})
              </button>
              {MEMBERS.map(member => {
                const count = todos.filter(t => t.assignees?.includes(member)).length;
                return (
                  <button
                    key={member}
                    onClick={() => setSelectedMemberFilter(member)}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                      selectedMemberFilter === member ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {member} ({count})
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddTodo} className="bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-900/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">タスク内容</label>
                  <input 
                    type="text" 
                    placeholder="例: パスポートの有効期限確認" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">担当者（複数選択可）</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {MEMBERS.map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-xs bg-white/60 border border-slate-200/80 px-3 py-2 rounded-xl cursor-pointer hover:bg-white transition select-none">
                        <input 
                          type="checkbox"
                          checked={newAssignees.includes(m)}
                          onChange={() => handleAssigneeToggle(m)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]">
                  追加する
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {sortedTodos.map(todo => (
                <div key={todo.id} className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl shadow-xl shadow-slate-900/5 p-5 flex items-center justify-between transition-all hover:bg-white/80">
                  <div className="flex items-center gap-3.5">
                    <input 
                      type="checkbox" 
                      checked={todo.is_completed}
                      onChange={() => toggleTodoComplete(todo.id, todo.is_completed)}
                      className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className={`text-base font-medium ${todo.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {todo.task}
                      </span>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {todo.assignees?.map(assignee => (
                          <span key={assignee} className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-lg">
                            {assignee}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="text-rose-500 text-xs font-medium hover:underline"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 費用・立替 */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">費用・立替管理</h1>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block">総支出合計 / 1人あたり平均</span>
                <span className="text-xl font-extrabold text-blue-600">
                  ¥{totalExpense.toLocaleString()} <span className="text-xs text-slate-500 font-normal">(¥{Math.round(fairShare).toLocaleString()} ÷ {MEMBERS.length}人)</span>
                </span>
              </div>
            </div>

            {/* 自動精算シミュレーション */}
            <div className="bg-white/75 backdrop-blur-2xl border border-blue-200/60 rounded-3xl p-6 shadow-xl shadow-blue-900/5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-blue-900">自動精算シミュレーション（6人均等割り勘）</h2>
                <button
                  onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                  className="text-xs text-blue-600 bg-white/80 border border-blue-200 px-3.5 py-1.5 rounded-xl font-semibold hover:bg-white transition shadow-xs"
                >
                  {showCalculationDetails ? '計算の内訳を隠す ▲' : '計算の内訳を見る ▼'}
                </button>
              </div>

              {showCalculationDetails && (
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-blue-100 text-xs space-y-3 shadow-inner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {memberBalances.map(mb => (
                      <div key={mb.member} className="bg-white/70 p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between shadow-xs">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{mb.member}</span>
                          <span className={mb.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}>
                            {mb.balance >= 0 ? `+¥${Math.round(mb.balance).toLocaleString()} 受取` : `-¥${Math.abs(Math.round(mb.balance)).toLocaleString()} 支払`}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-1 flex justify-between">
                          <span>立替: ¥{mb.paid.toLocaleString()}</span>
                          <span>負担: ¥{Math.round(fairShare).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settlements.length > 0 ? (
                <div className="space-y-2.5">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-blue-100 flex items-center justify-between text-sm shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">{s.from}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">{s.to}</span>
                      </div>
                      <span className="font-bold text-blue-600 text-base">¥{s.amount.toLocaleString()} を支払う</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-700 bg-blue-50/50 p-4 rounded-2xl text-center font-medium">
                  現在、追加ですべき送金はありません
                </p>
              )}
            </div>

            {/* 新規費用追加 */}
            <form onSubmit={handleAddExpense} className="bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-900/5 grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">項目名</label>
                <input 
                  type="text" 
                  placeholder="例: ホテル宿泊費" 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">金額 (円)</label>
                <input 
                  type="number" 
                  placeholder="例: 15000" 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">立替えた人</label>
                <select 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newExpensePaidBy}
                  onChange={(e) => setNewExpensePaidBy(e.target.value)}
                >
                  {MEMBERS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">カテゴリ</label>
                <select 
                  className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                >
                  <option value="宿泊">宿泊</option>
                  <option value="移動">移動</option>
                  <option value="食事">食事</option>
                  <option value="ショッピング">ショッピング</option>
                  <option value="美容・サロン">美容・サロン</option>
                  <option value="観光">観光</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="sm:col-span-5 flex justify-end">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]">
                  費用を追加
                </button>
              </div>
            </form>

            {/* 費用一覧 */}
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl shadow-xl shadow-slate-900/5 p-5 flex justify-between items-center transition-all hover:bg-white/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-lg">
                        {expense.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        立替: <strong className="text-slate-800">{expense.paidBy}</strong>
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{expense.title}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-extrabold text-slate-900">¥{expense.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => deleteExpense(expense.id)}
                      className="text-rose-500 text-xs font-medium hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. NAVER Map */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">NAVER Map 連携・マップ表示</h1>
              <button
                onClick={handleShowCurrentLocation}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                📍 現在地を表示
              </button>
            </div>

            <div className="bg-white/75 backdrop-blur-2xl border border-white/80 p-4 rounded-3xl shadow-xl shadow-slate-900/5 space-y-3">
              <div ref={mapRef} className="w-full h-80 rounded-2xl z-0 border border-slate-200/60 shadow-inner" />
            </div>

            <form onSubmit={handleFreeSearchSubmit} className="bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-3xl shadow-xl shadow-slate-900/5 flex gap-2.5">
              <input 
                type="text" 
                placeholder="例: 明洞 焼肉、弘大 カフェ（NAVER Mapでダイレクト検索）" 
                className="w-full bg-white/70 border border-slate-200/80 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={freeQuery}
                onChange={(e) => setFreeQuery(e.target.value)}
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] whitespace-nowrap">
                Mapで検索
              </button>
            </form>

            <form onSubmit={handleSaveMapSpot} className={`bg-white/70 backdrop-blur-xl border p-6 rounded-3xl shadow-xl shadow-slate-900/5 space-y-4 transition-all ${editingSpotId ? 'border-amber-400 bg-amber-50/30' : 'border-white/80'}`}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingSpotId ? 'スポットの編集中' : '新規スポットの追加'}
                  </h2>
                  {editingSpotId && (
                    <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">編集モード</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingSpotId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    >
                      キャンセル
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAutoGeocode}
                    disabled={isGeocoding}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isGeocoding ? '取得中...' : '入力内容から緯度経度を自動取得'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">スポット名 (日本語)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm"
                    value={newSpotNameJa}
                    onChange={(e) => setNewSpotNameJa(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">韓国語名称</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm font-mono"
                    value={newSpotNameKo}
                    onChange={(e) => setNewSpotNameKo(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">韓国語住所</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm font-mono"
                    value={newSpotAddressKo}
                    onChange={(e) => setNewSpotAddressKo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">カテゴリ</label>
                  <select 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm"
                    value={newSpotCategory}
                    onChange={(e) => setNewSpotCategory(e.target.value as any)}
                  >
                    <option value="拠点">拠点</option>
                    <option value="レストラン">レストラン</option>
                    <option value="カフェ">カフェ</option>
                    <option value="ショッピング">ショッピング</option>
                    <option value="夜系">夜系</option>
                    <option value="クラブ">クラブ</option>
                    <option value="両替所">両替所</option>
                    <option value="観光地">観光地</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">メモ</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm"
                    value={newSpotMemo}
                    onChange={(e) => setNewSpotMemo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">緯度 (lat)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm font-mono"
                    value={newSpotLat}
                    onChange={(e) => setNewSpotLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">経度 (lng)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/70 border border-slate-200/80 p-2.5 rounded-2xl text-sm font-mono"
                    value={newSpotLng}
                    onChange={(e) => setNewSpotLng(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className={`px-6 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg ${editingSpotId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingSpotId ? 'スポットを更新する' : 'スポットを追加'}
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2 bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-3xl shadow-xl shadow-slate-900/5">
              {MAP_CATEGORIES.map(cat => {
                const count = cat === 'すべて' ? mapSpots.length : mapSpots.filter(s => s.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedMapCategory(cat)}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                      selectedMapCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="space-y-3.5">
              {filteredMapSpots.map(spot => {
                const badgeColor = CATEGORY_COLORS[spot.category] || '#3b82f6';
                const searchKey = spot.nameKo || spot.addressKo || spot.nameJa;
                const naverSearchUrl = `https://map.naver.com/p/search/${encodeURIComponent(searchKey)}`;
                const isEditingThis = editingSpotId === spot.id;

                return (
                  <div key={spot.id} className={`bg-white/70 backdrop-blur-xl border rounded-3xl shadow-xl shadow-slate-900/5 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isEditingThis ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/80'}`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl text-white" style={{ backgroundColor: badgeColor }}>
                          {spot.category}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">{spot.nameJa}</h2>
                      </div>

                      {/* 韓国語名称・住所・メモの表示エリア */}
                      <div className="space-y-1 text-xs text-slate-600">
                        {spot.nameKo && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">韓国語名:</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{spot.nameKo}</span>
                            <button onClick={() => copyToClipboard(spot.nameKo, '韓国語名称')} className="text-blue-600 font-semibold hover:underline">コピー</button>
                          </div>
                        )}
                        {spot.addressKo && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">韓国語住所:</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{spot.addressKo}</span>
                            <button onClick={() => copyToClipboard(spot.addressKo, '韓国語住所')} className="text-blue-600 font-semibold hover:underline">コピー</button>
                          </div>
                        )}
                        {spot.memo && (
                          <div>
                            <span className="font-semibold text-slate-700">メモ:</span> <span>{spot.memo}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <a
                        href={naverSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap"
                      >
                        NAVER Mapで開く
                      </a>
                      <button 
                        onClick={() => handleStartEditMapSpot(spot)} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap"
                      >
                        編集
                      </button>
                      <button onClick={() => deleteMapSpot(spot.id)} className="text-rose-500 text-xs font-medium hover:underline px-2">
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}