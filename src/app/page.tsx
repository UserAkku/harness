'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Zap, Shield, Activity, ArrowRight, GitBranch, FlaskConical, Box, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

const features = [
  {
    icon: <Cpu size={28} strokeWidth={2.5} />,
    title: '30+ COMPONENTS',
    desc: 'Sensors, MCUs, actuators, logic gates, network modules, and power supplies — all simulated in real-time.',
  },
  {
    icon: <GitBranch size={28} strokeWidth={2.5} />,
    title: 'DRAG & WIRE',
    desc: 'Visual node editor powered by React Flow. Drag components, draw connections, build systems intuitively.',
  },
  {
    icon: <Activity size={28} strokeWidth={2.5} />,
    title: 'LIVE WAVEFORMS',
    desc: 'Real-time signal visualization. Monitor pin values, track state changes, debug timing issues.',
  },
  {
    icon: <Shield size={28} strokeWidth={2.5} />,
    title: 'FAULT INJECTION',
    desc: 'Inject sensor failures, network drops, stuck relays — test how your system handles the unexpected.',
  },
  {
    icon: <FlaskConical size={28} strokeWidth={2.5} />,
    title: 'TEST RUNNER',
    desc: 'Write automated tests with our DSL. Assert pin states, wait for conditions, validate behavior.',
  },
  {
    icon: <Zap size={28} strokeWidth={2.5} />,
    title: 'FIRMWARE LOGIC',
    desc: 'Write custom JavaScript firmware for MCU nodes. Full access to inputs, state, and emit functions.',
  },
];

const templates = [
  { name: 'SMART HOME', nodes: 5 },
  { name: 'INDUSTRIAL MONITOR', nodes: 7 },
  { name: 'ROBOTICS', nodes: 6 },
  { name: 'IOT GATEWAY', nodes: 7 },
  { name: 'HVAC SYSTEM', nodes: 7 },
  { name: 'SECURITY ALARM', nodes: 7 },
  { name: 'WEATHER STATION', nodes: 7 },
  { name: 'BLE WEARABLE', nodes: 6 },
];

export default function LandingPage() {
  const router = useRouter();
  const init = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-white text-black font-[family-name:var(--font-body)] overflow-x-hidden">
      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-black bg-white">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }} className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Box size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase" style={{ fontFamily: 'var(--font-heading)' }}>
              HARNESS
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest bg-black text-white border-[3px] border-black hover:bg-white hover:text-black transition-colors"
              >
                DASHBOARD <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest text-black bg-white border-[3px] border-black hover:bg-gray-100 transition-colors"
                >
                  LOG IN
                </button>
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="px-5 py-2 text-xs font-black uppercase tracking-widest bg-black text-white border-[3px] border-black hover:bg-white hover:text-black transition-colors"
                >
                  SIGN UP
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-32 pb-24 border-b-[3px] border-black" style={{ background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }} className="text-center">
          <div className="inline-block px-4 py-1.5 mb-8 border-[3px] border-black bg-white text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            BROWSER-BASED • NO HARDWARE NEEDED • FREE
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] font-black leading-[0.85] tracking-tighter uppercase mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
            SIMULATE<br />YOUR EMBEDDED<br />SYSTEMS
          </h1>
          <p className="text-sm md:text-base font-bold uppercase tracking-widest text-gray-600 mb-12" style={{ maxWidth: 600, margin: '0 auto' }}>
            DESIGN, WIRE, AND TEST EMBEDDED ARCHITECTURES ENTIRELY IN YOUR BROWSER. NO SOLDERING. NO FLASHING. JUST LOGIC.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => router.push(user ? '/dashboard' : '/auth/signup')}
              className="px-8 py-4 bg-black text-white text-sm font-black uppercase tracking-widest border-[3px] border-black hover:bg-white hover:text-black transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 flex items-center gap-3"
            >
              GET STARTED FREE <ArrowRight size={18} />
            </button>
            <button
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-white text-black text-sm font-black uppercase tracking-widest border-[3px] border-black hover:bg-gray-100 transition-colors flex items-center gap-3"
            >
              SEE FEATURES <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────── */}
      <section className="border-b-[3px] border-black bg-black text-white">
        <div style={{ maxWidth: 1280, margin: '0 auto' }} className="grid grid-cols-2 md:grid-cols-4">
          {[
            { label: 'COMPONENTS', value: '30+' },
            { label: 'CATEGORIES', value: '6' },
            { label: 'FAULT TYPES', value: '50+' },
            { label: 'TEMPLATES', value: '12' },
          ].map((stat, i) => (
            <div key={stat.label} className={`px-6 py-6 text-center ${i < 3 ? 'border-r-[3px] border-white/20' : ''}`}>
              <div className="text-3xl md:text-4xl font-black tabular-nums mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="py-24 border-b-[3px] border-black">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              EVERYTHING YOU NEED
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              A COMPLETE EMBEDDED SYSTEMS SIMULATION TOOLKIT
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 border-[3px] border-black bg-white hover:bg-black hover:text-white transition-all group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              >
                <div className="w-12 h-12 border-[3px] border-black group-hover:border-white flex items-center justify-center mb-4 bg-gray-100 group-hover:bg-white group-hover:text-black transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-black uppercase tracking-tight mb-2">{f.title}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-300 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates Preview ──────────────────────────── */}
      <section className="py-24 border-b-[3px] border-black bg-gray-50">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              START FROM A TEMPLATE
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              PRE-WIRED ARCHITECTURES TO JUMPSTART YOUR PROJECTS
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {templates.map((t) => (
              <div
                key={t.name}
                className="p-4 border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="text-sm font-black uppercase tracking-tight mb-2">{t.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {t.nodes} NODES PRE-WIRED
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => router.push(user ? '/dashboard' : '/auth/signup')}
              className="px-8 py-4 bg-black text-white text-sm font-black uppercase tracking-widest border-[3px] border-black hover:bg-white hover:text-black transition-colors inline-flex items-center gap-3"
            >
              START BUILDING <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How it Works ───────────────────────────────── */}
      <section className="py-24 border-b-[3px] border-black">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              HOW IT WORKS
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { step: '01', title: 'DRAG COMPONENTS', desc: 'Pick sensors, controllers, and actuators from the library. Drop them on the canvas.' },
              { step: '02', title: 'WIRE & CONFIGURE', desc: 'Draw connections between pins. Set properties, write firmware logic for MCUs.' },
              { step: '03', title: 'SIMULATE & TEST', desc: 'Hit RUN. Watch signals flow. Inject faults. Run automated test suites. Export results.' },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`p-8 border-[3px] border-black ${i < 2 ? 'border-r-0 md:border-r-[3px]' : ''} ${i < 2 ? 'border-b-0 md:border-b-[3px]' : 'border-b-[3px]'}`}
              >
                <div className="text-5xl font-black text-gray-200 mb-4">{item.step}</div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-3">{item.title}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="py-24 bg-black text-white border-b-[3px] border-black">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }} className="text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-[0.9]" style={{ fontFamily: 'var(--font-heading)' }}>
            READY TO<br />BUILD?
          </h2>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-10">
            FREE. BROWSER-BASED. NO CREDIT CARD REQUIRED.
          </p>
          <button
            onClick={() => router.push(user ? '/dashboard' : '/auth/signup')}
            className="px-10 py-5 bg-white text-black text-sm font-black uppercase tracking-widest border-[3px] border-white hover:bg-black hover:text-white hover:border-white transition-colors inline-flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)]"
          >
            CREATE FREE ACCOUNT <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t-[3px] border-black bg-white py-8">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }} className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black flex items-center justify-center">
              <Box size={14} className="text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter">HARNESS</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            V1.0.0 — VIRTUAL EMBEDDED SYSTEMS PLATFORM
          </span>
        </div>
      </footer>
    </div>
  );
}
