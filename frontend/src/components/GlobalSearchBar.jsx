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
    ? 'border border-blue-400/30 bg-blue-500/15 text-white placeholder-blue-200/60 focus-within:bg-blue-500/25'
    : 'border border-blue-200 bg-white text-slate-900 placeholder-slate-400 focus-within:border-blue-500';

  return (
    <form onSubmit={submit} className={`flex items-center gap-2 rounded-full px-4 transition-colors ${shell} ${compact ? 'w-full max-w-md' : 'w-full'}`}>
      <Search className={`h-4 w-4 flex-shrink-0 ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents and reports..."
        className="w-full bg-transparent py-2 text-sm outline-none"
      />
    </form>
  );
}
