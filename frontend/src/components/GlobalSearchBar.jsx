import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function GlobalSearchBar({ compact = true }) {
  const navigate = useNavigate();
  const { isDarkMode } = useAuthStore();
  const [query, setQuery] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      navigate('/search');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const shell = isDarkMode
    ? 'border-white/10 bg-white/5 text-white placeholder-slate-500 focus-within:border-indigo-500/50'
    : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus-within:border-indigo-400';

  return (
    <form onSubmit={submit} className={`flex items-center gap-2 rounded-xl border px-3 transition-colors ${shell} ${compact ? 'w-full max-w-md' : 'w-full'}`}>
      <Search className={`h-4 w-4 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents, reports, departments..."
        className="w-full bg-transparent py-2 text-sm outline-none"
      />
    </form>
  );
}
