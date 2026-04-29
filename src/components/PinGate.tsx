import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { verifyPin, setPin, getStoredHash, createResetToken, verifyResetToken, clearResetToken } from '../lib/pin';

const MAX_ATTEMPTS = 10;
const LOCKOUT_KEY = 'family-todo-lockout';
const SESSION_KEY = 'family-todo-pin-ok';

function getLockout(): { attempts: number; until: number } {
  try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}'); } catch { return { attempts: 0, until: 0 }; }
}
function saveLockout(attempts: number, until = 0) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, until }));
}

interface PinGateProps {
  onUnlock: () => void;
}

type Screen = 'enter' | 'setup' | 'forgot' | 'reset' | 'change';

export default function PinGate({ onUnlock }: PinGateProps) {
  const [screen, setScreen] = useState<Screen>('enter');
  const [pin, setPin_] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if session already unlocked
    if (sessionStorage.getItem(SESSION_KEY) === '1') { onUnlock(); return; }
    // Check if PIN is set
    getStoredHash().then(hash => {
      if (!hash) setIsFirstTime(true);
    });
    inputRef.current?.focus();
  }, []);

  useEffect(() => { setError(''); }, [screen]);
  useEffect(() => { inputRef.current?.focus(); }, [screen]);

  // Lockout check
  const lockout = getLockout();
  const isLockedOut = lockout.until && Date.now() < lockout.until;
  const lockoutMinutes = isLockedOut ? Math.ceil((lockout.until - Date.now()) / 60000) : 0;

  const handleEnter = async () => {
    if (isLockedOut) return;
    if (pin.length !== 4) { setError('Enter a 4-digit PIN.'); return; }
    setLoading(true);
    const ok = await verifyPin(pin);
    setLoading(false);
    if (ok) {
      saveLockout(0);
      sessionStorage.setItem(SESSION_KEY, '1');
      onUnlock();
    } else {
      const attempts = (getLockout().attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        saveLockout(attempts, Date.now() + 30 * 60 * 1000); // 30 min lockout
        setError('Too many attempts. Locked for 30 minutes.');
      } else {
        saveLockout(attempts);
        setError(`Incorrect PIN. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining.`);
      }
      setPin_('');
    }
  };

  const handleSetup = async () => {
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits.'); return; }
    if (pin !== confirmPin) { setError('PINs do not match.'); return; }
    setLoading(true);
    await setPin(pin);
    setLoading(false);
    sessionStorage.setItem(SESSION_KEY, '1');
    onUnlock();
  };

  const handleForgot = async () => {
    setLoading(true);
    const token = await createResetToken();
    // Send via EmailJS
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (serviceId && templateId && publicKey) {
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: { reset_code: token },
          }),
        });
        setInfo('Reset code sent to leowanavarro@gmail.com. Valid for 15 minutes.');
      } catch {
        setInfo(`Could not send email. Your reset code is: ${token}`);
      }
    } else {
      setInfo(`EmailJS not configured. Your reset code is: ${token}`);
    }
    setLoading(false);
    setScreen('reset');
  };

  const handleReset = async () => {
    if (resetCode.length !== 6) { setError('Enter the 6-digit reset code.'); return; }
    setLoading(true);
    const valid = await verifyResetToken(resetCode);
    setLoading(false);
    if (!valid) { setError('Invalid or expired code.'); return; }
    await clearResetToken();
    setScreen('change');
  };

  const handleChange = async () => {
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits.'); return; }
    if (pin !== confirmPin) { setError('PINs do not match.'); return; }
    setLoading(true);
    await setPin(pin);
    setLoading(false);
    saveLockout(0);
    sessionStorage.setItem(SESSION_KEY, '1');
    onUnlock();
  };

  const digitInput = (value: string, onChange: (v: string) => void, placeholder = '••••') => (
    <input
      ref={inputRef}
      type="password"
      inputMode="numeric"
      maxLength={4}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onKeyDown={e => e.key === 'Enter' && !loading && (
        screen === 'enter' ? handleEnter() :
        screen === 'setup' ? (value === pin ? handleSetup() : null) :
        screen === 'change' ? (value === pin ? handleChange() : null) : null
      )}
      placeholder={placeholder}
      className="w-full text-center text-3xl tracking-[0.5em] font-bold bg-secondary-bg border border-border rounded-2xl py-5 px-4 focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/20 [color-scheme:dark]"
    />
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary-bg px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-10"
      >
        {/* Icon + Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-accent/10 text-accent rounded-3xl ring-1 ring-accent/20 mx-auto">
            {screen === 'setup' || screen === 'change' ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              {screen === 'setup' && 'Set Your PIN'}
              {screen === 'enter' && 'Family Checklist'}
              {screen === 'forgot' && 'Forgot PIN'}
              {screen === 'reset' && 'Enter Reset Code'}
              {screen === 'change' && 'Set New PIN'}
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {screen === 'setup' && 'Create a 4-digit PIN to protect this app.'}
              {screen === 'enter' && (isFirstTime ? 'Set up your PIN to get started.' : 'Enter your PIN to continue.')}
              {screen === 'forgot' && 'Send a reset code to your email.'}
              {screen === 'reset' && (info || 'Enter the 6-digit code from your email.')}
              {screen === 'change' && 'Choose a new 4-digit PIN.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isLockedOut ? (
              <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <p className="text-rose-500 font-bold text-sm">Locked for {lockoutMinutes} more minute{lockoutMinutes === 1 ? '' : 's'}.</p>
                <p className="text-text-muted text-xs mt-1">Use "Forgot PIN" to regain access.</p>
              </motion.div>
            ) : screen === 'enter' && isFirstTime ? (
              <motion.button key="goto-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setScreen('setup')}
                className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
              >
                <ShieldCheck size={16} /> Set Up PIN
              </motion.button>
            ) : screen === 'enter' ? (
              <motion.div key="enter-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {digitInput(pin, setPin_)}
                <button onClick={handleEnter} disabled={loading || pin.length !== 4}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all disabled:opacity-20 shadow-lg shadow-accent/20"
                >
                  <ArrowRight size={16} /> {loading ? 'Checking...' : 'Unlock'}
                </button>
              </motion.div>
            ) : screen === 'setup' || screen === 'change' ? (
              <motion.div key="setup-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {digitInput(pin, setPin_, '••••')}
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={e => e.key === 'Enter' && !loading && (screen === 'setup' ? handleSetup() : handleChange())}
                  placeholder="Confirm PIN"
                  className="w-full text-center text-3xl tracking-[0.5em] font-bold bg-secondary-bg border border-border rounded-2xl py-5 px-4 focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/20 [color-scheme:dark]"
                />
                <button onClick={screen === 'setup' ? handleSetup : handleChange}
                  disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all disabled:opacity-20 shadow-lg shadow-accent/20"
                >
                  <ShieldCheck size={16} /> {loading ? 'Saving...' : 'Save PIN'}
                </button>
              </motion.div>
            ) : screen === 'forgot' ? (
              <motion.div key="forgot-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <button onClick={handleForgot} disabled={loading}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all disabled:opacity-20 shadow-lg shadow-accent/20"
                >
                  <RotateCcw size={16} /> {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
                <button onClick={() => setScreen('enter')} className="w-full py-3 text-text-muted text-xs font-bold uppercase tracking-widest hover:text-text-main transition-colors">
                  Back to PIN
                </button>
              </motion.div>
            ) : screen === 'reset' ? (
              <motion.div key="reset-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="6-digit code"
                  className="w-full text-center text-2xl tracking-[0.4em] font-bold bg-secondary-bg border border-border rounded-2xl py-5 px-4 focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/20"
                />
                <button onClick={handleReset} disabled={loading || resetCode.length !== 6}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all disabled:opacity-20 shadow-lg shadow-accent/20"
                >
                  <ArrowRight size={16} /> {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-xs font-bold text-rose-500"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Forgot PIN link */}
          {(screen === 'enter' && !isFirstTime && !isLockedOut) && (
            <button onClick={() => { setScreen('forgot'); setPin_(''); setError(''); }}
              className="w-full text-center text-[10px] uppercase tracking-widest font-bold text-text-muted/40 hover:text-accent transition-colors pt-2"
            >
              Forgot PIN?
            </button>
          )}
          {isLockedOut && (
            <button onClick={() => { setScreen('forgot'); setError(''); }}
              className="w-full text-center text-[10px] uppercase tracking-widest font-bold text-text-muted/40 hover:text-accent transition-colors pt-2"
            >
              Forgot PIN?
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
