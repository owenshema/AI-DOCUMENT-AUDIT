import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Bot, ShieldCheck,
  ClipboardCheck, FileText, GitBranch,
  Globe, Award, Users, Truck, Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

// ── Hero slider images — logistics/freight/shipping theme matching SIFCO AE ──
const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80',
    title: 'AI-Powered Document Audit',
    sub: 'Automate compliance and audit workflows across your supply chain operations.',
  },
  {
    url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&q=80',
    title: 'Freight Document Management',
    sub: 'Centralized document control for invoices, BOLs, and shipping records.',
  },
  {
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80',
    title: 'Global Logistics Compliance',
    sub: 'Ensure every shipment document meets ISO, C-TPAT, and regulatory standards.',
  },
  {
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&q=80',
    title: 'Real-Time Audit Intelligence',
    sub: 'AI-driven anomaly detection and compliance scoring on every document.',
  },
];

const MODULES = [
  { icon: Users,         title: 'User Management',     desc: 'Role-based access control with 2FA and OTP verification.' },
  { icon: FileText,      title: 'Document Hub',         desc: 'Upload, organize, and version-control all audit documents.' },
  { icon: Bot,           title: 'AI Analysis',          desc: 'Rule-based AI audits with fraud detection and compliance scoring.' },
  { icon: ClipboardCheck,title: 'Compliance Checks',    desc: 'Automated policy validation against supply chain standards.' },
  { icon: FileText,      title: 'Audit Reports',        desc: 'Generate and export professional audit reports as PDF.' },
  { icon: GitBranch,     title: 'Workflow & Tasks',     desc: 'Assign, track, and escalate document review tasks.' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide]       = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setSlide(s => (s + 1) % SLIDES.length);

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src="/sifco/logo.png" alt="SIFCO AE" className="h-9 w-auto"
              onError={e => { e.target.style.display='none'; }} />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">SIFCO AE</p>
              <p className="text-[10px] text-gray-500">DocAudit AI System</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {['Home','About','System','Services','Contact'].map(n => (
              <a key={n} href={`#${n.toLowerCase()}`}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                {n}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Login
            </Link>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              Get Started
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 pb-4">
            <div className="flex flex-col gap-2 pt-3">
              {['Home','About','System','Services','Contact'].map(n => (
                <a key={n} href={`#${n.toLowerCase()}`}
                  className="py-2 text-sm text-gray-600" onClick={() => setMenuOpen(false)}>{n}</a>
              ))}
              <Link to="/login" className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm text-gray-700" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to={isAuthenticated ? '/dashboard' : '/register'}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SLIDER ── */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Slides */}
        {SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.url} alt={s.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { e.target.style.display='none'; }} />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0d2044]/75 to-[#0a1628]/50" />
          </div>
        ))}

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 uppercase tracking-widest mb-6">
              SIFCO AE — Enterprise Audit Platform
            </div>

            {SLIDES.map((s, i) => (
              <div key={i} className={`transition-all duration-700 ${i === slide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}`}>
                {i === slide && (
                  <>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-5">
                      {s.title}
                    </h1>
                    <p className="text-lg text-white/70 mb-10 leading-relaxed">{s.sub}</p>
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-16">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition-colors">
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
              {[
                { value: '20+', label: 'Years Experience' },
                { value: '50+', label: 'Countries Served' },
                { value: 'ISO', label: 'Certified Quality' },
                { value: '24/7', label: 'Support Available' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/15 bg-white/8 p-3 text-center backdrop-blur">
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slider controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
          <button onClick={prev} className="h-8 w-8 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={`rounded-full transition-all ${i === slide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`} />
            ))}
          </div>
          <button onClick={next} className="h-8 w-8 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">About SIFCO AE</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-5">
                Leading Freight Forwarding in the Middle East
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Al Shamali International Freight Services LLC (SIFCO) is a leading freight forwarding company
                in the Middle East, supported by a worldwide network of agents spanning most countries.
                With two decades of cumulative expertise, our team brings deep knowledge in shipping,
                freight forwarding, and logistics.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                As an ISO-certified company, we are committed to delivering vertically integrated,
                high-quality services that build lasting partnerships with our customers across Africa
                and globally recognized organizations.
              </p>
              <div className="flex flex-wrap gap-3">
                {['ISO Certified', 'Global Network', '24/7 Support', 'Supply Chain Experts'].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    <CheckCircle2 className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">System Objectives</h3>
              <ul className="space-y-3">
                {[
                  'Automate document review and audit processes using AI',
                  'Improve transparency and accuracy in document management',
                  'Support compliance with organizational and regulatory policies',
                  'Enhance efficiency in document handling workflows',
                  'Provide insights for improved management decisions',
                ].map(obj => (
                  <li key={obj} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SYSTEM MODULES ── */}
      <section id="system" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Platform Modules</p>
            <h2 className="text-3xl font-bold text-gray-900">6 Integrated Modules</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Every aspect of document auditing covered — from ingestion to AI analysis and reporting.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <div key={m.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-6 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                  <m.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{m.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          {isAuthenticated && (
            <div className="text-center mt-10">
              <Link to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                Open Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-20 bg-[#0a1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Our Services</p>
          <h2 className="text-3xl font-bold text-white mb-4">Logistics & Freight Solutions</h2>
          <p className="text-white/60 max-w-xl mx-auto mb-12">
            SIFCO AE provides comprehensive freight forwarding and logistics services backed by two decades of expertise.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Truck,  title: 'Freight Forwarding', desc: 'Air, sea, and land freight solutions worldwide.' },
              { icon: Globe,  title: 'Global Network',     desc: 'Agents spanning most countries globally.' },
              { icon: Award,  title: 'ISO Certified',      desc: 'Committed to vertically integrated quality.' },
              { icon: ShieldCheck, title: 'Compliance',   desc: 'Regulatory compliance across all operations.' },
            ].map(s => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / FOOTER ── */}
      <footer id="contact" className="bg-gray-900 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/sifco/logo.png" alt="SIFCO AE" className="h-8 w-auto brightness-0 invert"
                  onError={e => { e.target.style.display='none'; }} />
                <span className="text-base font-bold text-white">SIFCO AE</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                AI-powered internal platform for enterprise document auditing, compliance verification,
                and lifecycle management within SIFCO AE.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#system" className="hover:text-white transition-colors">System</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>SIFCO AE — Internal Audit Program</li>
                <li>Document Governance Office</li>
                <li>Dubai, UAE</li>
                <li>audit-admin@sifco.local</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} SIFCO AE. AI-Powered Document Audit & Management System.
          </div>
        </div>
      </footer>
    </div>
  );
}
