import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ShieldCheck,
  Globe, Award, Truck, Menu, X, ChevronLeft, ChevronRight,
  Mail, MapPin, Clock,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80',
    title: 'Global Freight Forwarding',
    sub: 'Reliable air, sea, and land freight solutions across the Middle East and worldwide.',
  },
  {
    url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&q=80',
    title: 'End-to-End Logistics',
    sub: 'From port to destination — seamless supply chain management you can trust.',
  },
  {
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80',
    title: 'Worldwide Network',
    sub: 'A global agent network spanning most countries, delivering wherever you need.',
  },
  {
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&q=80',
    title: 'ISO-Certified Excellence',
    sub: 'Two decades of expertise in shipping, freight forwarding, and logistics.',
  },
];

const NAV_LINKS = ['Home', 'About', 'Services', 'Contact'];

const CARD_HOVER =
  'relative transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-xl hover:z-10';

function SectionLabel({ children, dark = false }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
      {children}
    </p>
  );
}

function SectionHeading({ children, dark = false, className = '' }) {
  return (
    <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'} ${className}`}>
      {children}
    </h2>
  );
}

function NavLink({ name, active, onClick, mobile = false }) {
  const id = name.toLowerCase();
  const isActive = active === id;

  const base = mobile
    ? 'py-2.5 text-sm transition-colors'
    : 'relative py-1 text-sm transition-colors';

  const color = isActive
    ? 'text-indigo-400 font-semibold'
    : 'text-gray-300 font-medium hover:text-white';

  return (
    <a
      href={`#${id}`}
      onClick={onClick}
      className={`${base} ${color}`}
    >
      {name}
      {!mobile && isActive && (
        <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-indigo-400" />
      )}
    </a>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const updateActiveSection = useCallback(() => {
    const offset = window.innerHeight * 0.35;
    let current = 'home';

    NAV_LINKS.forEach(name => {
      const el = document.getElementById(name.toLowerCase());
      if (el && el.getBoundingClientRect().top <= offset) {
        current = name.toLowerCase();
      }
    });

    setActiveSection(current);
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [updateActiveSection]);

  const prev = () => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setSlide(s => (s + 1) % SLIDES.length);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 scroll-smooth">

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0a1628] border-b ${
        scrolled ? 'border-indigo-900/50 shadow-lg shadow-black/20' : 'border-indigo-900/30'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src="/sifco/logo.png" alt="SIFCO AE" className="h-9 w-auto"
              onError={e => { e.target.style.display = 'none'; }} />
            <div>
              <p className="text-sm font-bold text-white leading-none">SIFCO AE</p>
              <p className="text-[10px] text-indigo-300 font-medium">Freight & Logistics</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(n => (
              <NavLink key={n} name={n} active={activeSection} />
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-gray-200 hover:border-indigo-400 hover:text-white transition-colors">
              Login
            </Link>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-colors">
              Get Started
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-300 hover:text-white transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-indigo-900/40 bg-[#0a1628] px-4 pb-4">
            <div className="flex flex-col pt-2">
              {NAV_LINKS.map(n => (
                <NavLink key={n} name={n} active={activeSection} onClick={closeMenu} mobile />
              ))}
              <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-indigo-900/40">
                <Link to="/login" className="rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm text-gray-200 hover:border-indigo-400 transition-colors" onClick={closeMenu}>Login</Link>
                <Link to={isAuthenticated ? '/dashboard' : '/register'}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500 transition-colors" onClick={closeMenu}>Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden scroll-mt-16">
        {SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.url} alt={s.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/97 via-[#0a1628]/88 to-[#0a1628]/75" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/85 via-[#0a1628]/20 to-transparent" />
          </div>
        ))}

        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
          <div className="max-w-2xl rounded-2xl bg-[#0a1628]/40 backdrop-blur-sm p-6 sm:p-8 border border-white/10">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white uppercase tracking-widest mb-6 shadow-md">
              SIFCO AE — Freight & Logistics
            </div>

            {SLIDES.map((s, i) => (
              <div key={i} className={`transition-all duration-700 ${i === slide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}`}>
                {i === slide && (
                  <>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-5 drop-shadow-lg">
                      {s.title}
                    </h1>
                    <p className="text-lg text-gray-100 mb-10 leading-relaxed max-w-xl drop-shadow-md">{s.sub}</p>
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-10">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors">
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#about"
                className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-[#0a1628]/70 px-8 py-3.5 text-base font-semibold text-white backdrop-blur hover:bg-[#0a1628]/90 transition-colors">
                Learn More
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
              {[
                { value: '20+', label: 'Years Experience' },
                { value: '50+', label: 'Countries Served' },
                { value: 'ISO', label: 'Certified Quality' },
                { value: '24/7', label: 'Support Available' },
              ].map(s => (
                <div key={s.label}
                  className={`rounded-xl border border-white/20 bg-[#0a1628]/80 backdrop-blur-md p-4 text-center ${CARD_HOVER} hover:border-indigo-400/60 hover:bg-[#0a1628]/95 hover:shadow-indigo-500/30`}>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-200 mt-1 font-medium leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
          <button onClick={prev} className="h-8 w-8 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-indigo-600/40 hover:border-indigo-400/50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={`rounded-full transition-all ${i === slide ? 'w-6 h-2 bg-indigo-400' : 'w-2 h-2 bg-white/40 hover:bg-indigo-300/60'}`} />
            ))}
          </div>
          <button onClick={next} className="h-8 w-8 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-indigo-600/40 hover:border-indigo-400/50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 bg-gray-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>About SIFCO AE</SectionLabel>
              <SectionHeading className="mb-5">
                Leading Freight Forwarding in the Middle East
              </SectionHeading>
              <p className="text-gray-600 leading-relaxed mb-4">
                Al Shamali International Freight Services LLC (SIFCO) is a leading freight forwarding company
                in the Middle East, supported by a worldwide network of agents spanning most countries.
                With two decades of cumulative expertise, our team brings deep knowledge in shipping,
                freight forwarding, and logistics.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                As an ISO-certified company, we are committed to delivering vertically integrated,
                high-quality services that build lasting partnerships with our customers across Africa
                and globally recognized organizations.
              </p>
              <div className="flex flex-wrap gap-3">
                {['ISO Certified', 'Global Network', '24/7 Support', 'Supply Chain Experts'].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" /> {t}
                  </span>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm shadow-indigo-100/50 ${CARD_HOVER} hover:border-indigo-300 hover:shadow-indigo-200/60`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Why Choose SIFCO AE</h3>
              <ul className="space-y-4">
                {[
                  'Two decades of freight forwarding expertise across the Middle East',
                  'Worldwide agent network covering most countries',
                  'ISO-certified quality and vertically integrated services',
                  'Dedicated support for air, sea, and land shipments',
                  'Trusted partnerships with global organizations',
                ].map(obj => (
                  <li key={obj} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                    </span>
                    <span className="text-sm text-gray-600 leading-relaxed">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 bg-[#0a1628] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <SectionLabel dark>Our Services</SectionLabel>
            <SectionHeading dark className="mb-4">Logistics & Freight Solutions</SectionHeading>
            <p className="text-white/65 max-w-xl mx-auto">
              SIFCO AE provides comprehensive freight forwarding and logistics services backed by two decades of expertise.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 relative">
            {[
              { icon: Truck, title: 'Freight Forwarding', desc: 'Air, sea, and land freight solutions worldwide.' },
              { icon: Globe, title: 'Global Network', desc: 'Agents spanning most countries globally.' },
              { icon: Award, title: 'ISO Certified', desc: 'Committed to vertically integrated quality.' },
              { icon: ShieldCheck, title: 'Compliance', desc: 'Regulatory compliance across all operations.' },
            ].map(s => (
              <div key={s.title}
                className={`rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-6 text-left ${CARD_HOVER} hover:border-indigo-400/50 hover:bg-indigo-900/30 hover:shadow-indigo-900/50`}>
                <div className="h-11 w-11 rounded-xl bg-indigo-600/25 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-indigo-300" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-indigo-200/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <SectionLabel>Get In Touch</SectionLabel>
            <SectionHeading className="mb-4">Contact Us</SectionHeading>
            <p className="text-gray-600 max-w-xl mx-auto">
              Reach out to SIFCO AE for freight forwarding and logistics inquiries.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 relative max-w-4xl mx-auto">
            {[
              {
                icon: MapPin,
                title: 'Location',
                lines: [
                  { text: 'Al Shamali International Freight Services LLC', bold: true },
                  { text: 'Dubai, United Arab Emirates' },
                  { text: 'Kigali, Rwanda' },
                ],
              },
              {
                icon: Mail,
                title: 'Email',
                href: 'mailto:info@sifco.ae?subject=SIFCO%20AE%20Inquiry',
                lines: [
                  { text: 'info@sifco.ae', bold: true },
                  { text: 'Click to send us an email' },
                ],
              },
              {
                icon: Clock,
                title: 'Hours',
                lines: [
                  { text: 'Sunday – Thursday', bold: true },
                  { text: '8:00 AM – 6:00 PM GST' },
                ],
              },
            ].map(c => {
              const CardWrapper = c.href ? 'a' : 'div';
              const wrapperProps = c.href
                ? { href: c.href, className: `block rounded-2xl border border-indigo-100 bg-gray-50 p-8 text-center cursor-pointer no-underline ${CARD_HOVER} hover:border-indigo-300 hover:bg-white hover:shadow-indigo-200/60` }
                : { className: `rounded-2xl border border-indigo-100 bg-gray-50 p-8 text-center ${CARD_HOVER} hover:border-indigo-300 hover:bg-white hover:shadow-indigo-200/60` };

              return (
              <CardWrapper key={c.title} {...wrapperProps}>
                <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-5 mx-auto shadow-sm shadow-indigo-600/25">
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">{c.title}</h3>
                <div className="space-y-1.5">
                  {c.lines.map(line => (
                    <p key={line.text} className={`text-sm leading-relaxed ${line.bold ? 'font-semibold text-indigo-600' : 'text-gray-500'}`}>
                      {line.text}
                    </p>
                  ))}
                </div>
                {c.href && (
                  <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-indigo-600">
                    Send Email <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </CardWrapper>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0a1628] py-14 border-t border-indigo-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/sifco/logo.png" alt="SIFCO AE" className="h-8 w-auto brightness-0 invert"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div>
                  <span className="text-base font-bold text-white block">SIFCO AE</span>
                  <span className="text-[10px] text-indigo-300 font-medium">Freight & Logistics</span>
                </div>
              </div>
              <p className="text-sm text-indigo-200/60 leading-relaxed">
                Leading freight forwarding and logistics company in the Middle East,
                serving customers worldwide with reliable supply chain solutions.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                {NAV_LINKS.map(n => {
                  const id = n.toLowerCase();
                  const isActive = activeSection === id;
                  return (
                    <li key={n}>
                      <a href={`#${id}`}
                        className={`transition-colors ${isActive ? 'text-indigo-300 font-medium' : 'text-indigo-200/50 hover:text-indigo-300'}`}>
                        {n}
                      </a>
                    </li>
                  );
                })}
                <li><Link to="/login" className="text-indigo-200/50 hover:text-indigo-300 transition-colors">Login</Link></li>
                <li><Link to="/register" className="text-indigo-200/50 hover:text-indigo-300 transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2.5 text-sm text-indigo-200/50">
                <li>Al Shamali International Freight Services LLC</li>
                <li>Dubai, United Arab Emirates</li>
                <li>Kigali, Rwanda</li>
                <li>
                  <a href="mailto:info@sifco.ae?subject=SIFCO%20AE%20Inquiry" className="hover:text-indigo-300 transition-colors underline underline-offset-2">info@sifco.ae</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-indigo-900/40 pt-6 text-center text-xs text-indigo-300/40">
            © {new Date().getFullYear()} SIFCO AE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
