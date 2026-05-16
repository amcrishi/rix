'use client';

/**
 * Live Cardio Tracker — /dashboard/workouts/cardio/session
 *
 * Tracks in real-time:
 *   • Elapsed time (timer)
 *   • Distance (GPS Haversine)
 *   • Current speed & avg speed (km/h)
 *   • Calories burned (MET formula × user weight)
 *   • Route map (Leaflet + OpenStreetMap, GPS polyline)
 *
 * Phases: pick → active (running/paused) → done (summary + save)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

// Leaflet must be loaded client-side only
const RouteMap = dynamic(() => import('@/components/cardio/RouteMap'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center rounded-xl"
    style={{ background: 'var(--bg-hover)', minHeight: 200 }}>
    <span style={{ color: 'var(--text-muted)' }}>Loading map…</span>
  </div>
) });

// ─── Constants ────────────────────────────────────────

const CARDIO_TYPES = [
  { id: 'running',   label: 'Running',   icon: '🏃', met: 8.3  },
  { id: 'cycling',   label: 'Cycling',   icon: '🚴', met: 7.5  },
  { id: 'hiking',    label: 'Hiking',    icon: '🥾', met: 5.3  },
  { id: 'hiit',      label: 'HIIT',      icon: '⚡', met: 10.0 },
  { id: 'jump_rope', label: 'Jump Rope', icon: '🤸', met: 12.3 },
  { id: 'swimming',  label: 'Swimming',  icon: '🏊', met: 6.0  },
  { id: 'walking',   label: 'Walking',   icon: '🚶', met: 3.5  },
  { id: 'cycling_indoor', label: 'Spin',icon: '🎯', met: 8.0  },
  { id: 'other',     label: 'Other',     icon: '🏋️', met: 5.0  },
];

// Haversine — distance in km between two GPS coords
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcCalories(met: number, weightKg: number, elapsedSec: number, distanceKm: number, speedKmh: number, activityType: string): number {
  // Apple Health-style calorie calculation:
  // Uses speed-adjusted MET for walking/running + distance-based cross-check
  
  let effectiveMet = met;
  
  if (activityType === 'walking') {
    // Dynamic MET based on walking speed (ACSM Compendium of Physical Activities)
    if (speedKmh <= 2.7) effectiveMet = 2.0;
    else if (speedKmh <= 3.2) effectiveMet = 2.5;
    else if (speedKmh <= 4.0) effectiveMet = 2.8;
    else if (speedKmh <= 4.8) effectiveMet = 3.3;
    else if (speedKmh <= 5.6) effectiveMet = 3.8;
    else if (speedKmh <= 6.4) effectiveMet = 5.0;
    else effectiveMet = 6.3; // brisk walking / race walking
    
    // Distance-based calculation (Apple Health approach): ~0.75-1.0 kcal per kg per km
    const distanceFactor = speedKmh > 5 ? 1.0 : 0.8;
    const distanceCalories = weightKg * distanceKm * distanceFactor;
    
    // Time-based MET calculation
    const timeCalories = effectiveMet * weightKg * (elapsedSec / 3600);
    
    // Use the higher value (handles both short/intense and long/slow walks)
    return Math.round(Math.max(distanceCalories, timeCalories));
  }
  
  if (activityType === 'running') {
    // Running: ~1.0-1.2 kcal per kg per km (speed increases MET)
    if (speedKmh >= 6 && speedKmh < 8) effectiveMet = 8.3;
    else if (speedKmh >= 8 && speedKmh < 10) effectiveMet = 9.8;
    else if (speedKmh >= 10 && speedKmh < 12) effectiveMet = 11.0;
    else if (speedKmh >= 12 && speedKmh < 14) effectiveMet = 12.5;
    else if (speedKmh >= 14) effectiveMet = 14.5;
    
    const distanceCalories = weightKg * distanceKm * 1.05;
    const timeCalories = effectiveMet * weightKg * (elapsedSec / 3600);
    return Math.round(Math.max(distanceCalories, timeCalories));
  }
  
  // Other activities: standard MET formula
  return Math.round(effectiveMet * weightKg * (elapsedSec / 3600));
}

// Steps calculation (Apple Health uses stride length based on height, default ~0.7m for walking)
function calcSteps(distanceKm: number, speedKmh: number, activityType: string): number {
  if (activityType !== 'walking' && activityType !== 'running' && activityType !== 'hiking') return 0;
  // Stride length varies by speed: slower = shorter stride
  let strideMeters: number;
  if (activityType === 'running') {
    strideMeters = speedKmh > 10 ? 1.2 : speedKmh > 8 ? 1.0 : 0.85;
  } else {
    // Walking: stride ~0.6m (slow) to 0.78m (brisk)
    strideMeters = speedKmh > 5.5 ? 0.78 : speedKmh > 4.5 ? 0.72 : speedKmh > 3.5 ? 0.67 : 0.60;
  }
  return Math.round((distanceKm * 1000) / strideMeters);
}

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

// ─── Types ────────────────────────────────────────────

type Phase = 'pick' | 'active' | 'done';

interface Coord { lat: number; lng: number; ts: number; }

// ─── Main Page ────────────────────────────────────────

export default function LiveCardioPage() {
  const router = useRouter();

  const [phase, setPhase]               = useState<Phase>('pick');
  const [selectedType, setSelectedType] = useState('running');
  const [paused, setPaused]             = useState(false);

  // GPS + stats
  const [coords, setCoords]             = useState<Coord[]>([]);
  const [distanceKm, setDistanceKm]     = useState(0);
  const [elapsed, setElapsed]           = useState(0);          // seconds (total active)
  const [currentSpeed, setCurrentSpeed] = useState(0);          // km/h
  const [maxSpeed, setMaxSpeed]         = useState(0);
  const [userWeight, setUserWeight]     = useState(70);         // kg fallback

  // Permissions / errors
  const [gpsError, setGpsError]         = useState('');
  const [gpsStatus, setGpsStatus]       = useState<'pending' | 'granted' | 'denied' | 'unsupported'>('pending');

  const watchRef        = useRef<number | null>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedAtRef     = useRef<number>(0);
  const totalPausedRef  = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const lastCoordRef    = useRef<Coord | null>(null);

  // Fetch user weight from profile for accurate calorie calc
  useEffect(() => {
    api.get<{ profile?: { weight?: number } }>('/profile')
      .then(r => { if (r.data?.profile?.weight) setUserWeight(r.data.profile.weight); })
      .catch(() => {});
  }, []);

  const ctInfo = CARDIO_TYPES.find(c => c.id === selectedType) || CARDIO_TYPES[0];
  const avgSpeed = elapsed > 0 && distanceKm > 0 ? (distanceKm / (elapsed / 3600)) : 0;
  const calories = calcCalories(ctInfo.met, userWeight, elapsed, distanceKm, avgSpeed, selectedType);
  const steps = calcSteps(distanceKm, avgSpeed, selectedType);

  // ── GPS Watcher ──────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('granted');
        const newCoord: Coord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
        };
        if (!paused) {
          setCoords(prev => {
            const updated = [...prev, newCoord];

            // Distance delta
            const last = prev[prev.length - 1];
            if (last) {
              const delta = haversine(last.lat, last.lng, newCoord.lat, newCoord.lng);
              setDistanceKm(d => d + delta);

              // Instantaneous speed (km/h)
              const dtHours = (newCoord.ts - last.ts) / 3600000;
              if (dtHours > 0) {
                const spd = delta / dtHours;
                // Filter noise: only record if < 200 km/h
                if (spd < 200) {
                  setCurrentSpeed(Math.round(spd * 10) / 10);
                  setMaxSpeed(prev => Math.max(prev, spd));
                }
              }
            }
            lastCoordRef.current = newCoord;
            return updated;
          });
        }
      },
      (err) => {
        setGpsStatus('denied');
        setGpsError(
          err.code === 1 ? 'Location access denied. Enable GPS in your browser settings.' :
          err.code === 2 ? 'GPS signal not available. Move to an open area.' :
          'GPS timed out. Check your location settings.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }, [paused]);

  const stopGPS = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation?.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  // ── Timer ─────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Lifecycle ─────────────────────────────────────────
  const handleStart = useCallback(() => {
    sessionStartRef.current = Date.now();
    setPhase('active');
    startGPS();
    startTimer();
  }, [startGPS, startTimer]);

  const handlePause = useCallback(() => {
    setPaused(true);
    pausedAtRef.current = Date.now();
    stopTimer();
    setCurrentSpeed(0);
  }, [stopTimer]);

  const handleResume = useCallback(() => {
    const pausedDuration = Date.now() - pausedAtRef.current;
    totalPausedRef.current += pausedDuration;
    setPaused(false);
    startTimer();
  }, [startTimer]);

  const handleStop = useCallback(async () => {
    stopTimer();
    stopGPS();
    setPhase('done');
  }, [stopTimer, stopGPS]);

  const handleSave = useCallback(async () => {
    try {
      await api.post('/workouts/cardio', {
        type: selectedType,
        duration: Math.ceil(elapsed / 60),
        distance: Math.round(distanceKm * 100) / 100,
        distanceUnit: 'km',
        intensity: avgSpeed > 12 ? 'intense' : avgSpeed > 7 ? 'moderate' : 'light',
        caloriesBurned: calories,
      });
    } catch { /* ignore */ }
    router.push('/dashboard/workouts?tab=cardio');
  }, [selectedType, elapsed, distanceKm, avgSpeed, calories, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopTimer(); stopGPS(); };
  }, [stopTimer, stopGPS]);

  // ── Render: Pick Phase ─────────────────────────────────

  if (phase === 'pick') {
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 text-sm"
          style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Live Cardio Tracker</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Track your session in real time — time, distance, speed, route & calories.
        </p>

        {/* GPS permission info */}
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span className="text-xl">📍</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GPS Required</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Allow location access when prompted. Your route is only stored on your device during the session.
            </p>
          </div>
        </div>

        {/* Activity picker */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
          {CARDIO_TYPES.map(ct => (
            <button key={ct.id} onClick={() => setSelectedType(ct.id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
              style={{
                background: selectedType === ct.id ? 'rgba(255,255,255,0.06)' : 'var(--bg-card)',
                borderColor: selectedType === ct.id ? '#fff' : 'var(--border-color)',
              }}>
              <span className="text-2xl">{ct.icon}</span>
              <span className="text-[10px] font-medium text-center leading-tight"
                style={{ color: selectedType === ct.id ? '#fff' : 'var(--text-muted)' }}>
                {ct.label}
              </span>
            </button>
          ))}
        </div>

        <button onClick={handleStart}
          className="w-full py-4 rounded-xl text-black font-bold text-lg transition-all hover:scale-[1.02] uppercase tracking-wider"
          style={{ background: '#fff' }}>
          {ctInfo.icon} Start {ctInfo.label}
        </button>
      </div>
    );
  }

  // ── Render: Done Phase ─────────────────────────────────

  if (phase === 'done') {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Session Complete!</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {ctInfo.icon} {ctInfo.label} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatBox label="Duration" value={fmt(elapsed)} unit="" color="#fff" />
          <StatBox label="Distance" value={distanceKm.toFixed(2)} unit="km" color="#3b82f6" />
          <StatBox label="Avg Speed" value={avgSpeed.toFixed(1)} unit="km/h" color="#a855f7" />
          {steps > 0 ? (
            <StatBox label="Steps" value={steps.toLocaleString('en-IN')} unit="steps" color="#f59e0b" />
          ) : (
            <StatBox label="Max Speed" value={maxSpeed.toFixed(1)} unit="km/h" color="#d4d4d4" />
          )}
          <StatBox label="Calories" value={String(calories)} unit="kcal" color="#22c55e" />
          <StatBox label="Pace" value={avgSpeed > 0 ? `${(60 / avgSpeed).toFixed(1)}` : '—'} unit="min/km" color="#eab308" />
        </div>

        {/* Route summary */}
        {coords.length > 1 && (
          <div className="rounded-xl overflow-hidden mb-6" style={{ height: 220 }}>
            <RouteMap coords={coords} />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-black font-semibold uppercase tracking-wider"
            style={{ background: '#fff' }}>
            💾 Save Session
          </button>
          <button onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 rounded-xl font-semibold"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Active Phase ──────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      {/* Activity + status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ctInfo.icon}</span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ctInfo.label}</p>
            <p className="text-xs" style={{ color: paused ? '#eab308' : '#22c55e' }}>
              {paused ? '⏸ Paused' : '● Live'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {paused ? (
            <button onClick={handleResume}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#22c55e' }}>
              ▶ Resume
            </button>
          ) : (
            <button onClick={handlePause}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}>
              ⏸ Pause
            </button>
          )}
          <button onClick={handleStop}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.2)' }}>
            ■ Stop
          </button>
        </div>
      </div>

      {/* GPS error/status */}
      {gpsError && (
        <div className="rounded-xl p-3 mb-4 text-sm flex items-start gap-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc' }}>
          ⚠️ {gpsError}
        </div>
      )}
      {gpsStatus === 'pending' && !gpsError && (
        <div className="rounded-xl p-3 mb-4 text-sm flex items-center gap-2"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
          <span className="animate-spin">⟳</span> Acquiring GPS signal…
        </div>
      )}

      {/* Big Timer */}
      <div className="rounded-2xl p-6 text-center mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Elapsed Time</p>
        <p className="font-mono font-bold" style={{ fontSize: '3.5rem', lineHeight: 1, color: 'var(--text-primary)' }}>{fmt(elapsed)}</p>
      </div>

      {/* Live stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <LiveStat label="Distance" value={distanceKm >= 1 ? distanceKm.toFixed(2) : (distanceKm * 1000).toFixed(0)} unit={distanceKm >= 1 ? 'km' : 'm'} color="#3b82f6" />
        <LiveStat label="Speed" value={currentSpeed.toFixed(1)} unit="km/h" color="#a855f7" />
        <LiveStat label="Avg Speed" value={avgSpeed.toFixed(1)} unit="km/h" color="#d4d4d4" />
        <LiveStat label="Calories" value={String(calories)} unit="kcal" color="#22c55e" />
        {steps > 0 ? (
          <LiveStat label="Steps" value={steps.toLocaleString('en-IN')} unit="steps" color="#f59e0b" />
        ) : (
          <LiveStat label="Max Speed" value={maxSpeed.toFixed(1)} unit="km/h" color="#ec4899" />
        )}
        <LiveStat label="Pace" value={avgSpeed > 0 ? (60 / avgSpeed).toFixed(1) : '—'} unit="min/km" color="#eab308" />
      </div>

      {/* Live Route Map */}
      <div className="rounded-xl overflow-hidden" style={{ height: 260, border: '1px solid var(--border-color)' }}>
        {coords.length > 0 ? (
          <RouteMap coords={coords} live />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: 'var(--bg-card)' }}>
            <span className="text-3xl mb-2">📍</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {gpsStatus === 'denied' ? 'GPS disabled' : 'Waiting for GPS…'}
            </p>
          </div>
        )}
      </div>

      {/* Coords counter */}
      {coords.length > 0 && (
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          📍 {coords.length} GPS points recorded
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function LiveStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</p>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</p>
    </div>
  );
}
