import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Eye, EyeOff, AlertCircle, Check, Plus } from 'lucide-react';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.pc-login * {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pc-card {
  animation: fadeIn 0.4s ease-out both;
}

.pc-input {
  width: 100%;
  padding: 11px 14px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #111827;
  font-size: 14px;
  outline: none;
  transition: all 0.15s ease-in-out;
}

.pc-input:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}

.pc-checkbox {
  width: 17px;
  height: 17px;
  border-radius: 4px;
  border: 1.5px solid #d1d5db;
  cursor: pointer;
  accent-color: #111827;
}

.pc-btn-primary {
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background-color: #0d0e11;
  transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pc-btn-primary:hover:not(:disabled) {
  background-color: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pc-btn-primary:active:not(:disabled) {
  transform: translateY(1px);
}

.pc-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pc-badge-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.pc-badge-btn:hover {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}
`;

export const Login: React.FC = () => {
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe]     = useState(true);
    const [error, setError]               = useState('');
    const [isLoading, setIsLoading]       = useState(false);

    const login    = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const fillDemo = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid username or password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pc-login" style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            padding: '24px 16px',
        }}>
            <style>{STYLES}</style>

            {/* Main Split Container */}
            <div className="pc-card" style={{
                width: '100%',
                maxWidth: 960,
                minHeight: 560,
                backgroundColor: '#ffffff',
                borderRadius: 24,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
            }}>

                {/* ── Left Branding Panel ── */}
                <div style={{
                    flex: '1 1 50%',
                    backgroundColor: '#cae7ce',
                    padding: '44px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                }}>
                    <div>
                        {/* Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 54 }}>
                            <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: '#137d2e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(19, 125, 46, 0.25)',
                            }}>
                                <Plus size={22} color="#ffffff" strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#0d4a1b', letterSpacing: '-0.3px' }}>
                                PharmaCare
                            </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h1 style={{
                            fontSize: 32,
                            fontWeight: 700,
                            color: '#0a3d16',
                            lineHeight: 1.22,
                            letterSpacing: '-0.6px',
                            marginBottom: 16,
                            maxWidth: 380,
                        }}>
                            Manage your pharmacy with confidence
                        </h1>
                        <p style={{
                            fontSize: 15,
                            lineHeight: 1.5,
                            color: '#1e5e2f',
                            marginBottom: 36,
                            maxWidth: 360,
                        }}>
                            Inventory, prescriptions, sales, and expiry alerts in one place.
                        </p>

                        {/* Features Check List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {[
                                'Real-time stock tracking',
                                'Prescription management',
                                'Expiry and low-stock alerts',
                            ].map((feature, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 4,
                                        border: '1.5px solid #1c6b30',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Check size={13} color="#155d28" strokeWidth={3} />
                                    </div>
                                    <span style={{ fontSize: 14.5, fontWeight: 500, color: '#114a21' }}>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer tag */}
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#276839', marginTop: 40 }}>
                        Licensed pharmacy software
                    </div>
                </div>

                {/* ── Right Auth Form Panel ── */}
                <div style={{
                    flex: '1 1 50%',
                    padding: '48px 44px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                }}>
                    <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>

                        <h2 style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: '#111827',
                            marginBottom: 6,
                            letterSpacing: '-0.4px',
                        }}>
                            Welcome back
                        </h2>
                        <p style={{
                            fontSize: 14,
                            color: '#6b7280',
                            marginBottom: 26,
                        }}>
                            Sign in to your pharmacy account
                        </p>

                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 10,
                                padding: '10px 12px',
                                marginBottom: 20,
                                color: '#991b1b',
                                fontSize: 13,
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#dc2626' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                            {/* Username or Email */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: 6,
                                }}>
                                    Username or email
                                </label>
                                <input
                                    className="pc-input"
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@pharmacy.com"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: 6,
                                }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="pc-input"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        style={{ paddingRight: 40 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#9ca3af',
                                            cursor: 'pointer',
                                            padding: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me & Forgot Password */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: 2,
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    color: '#4b5563',
                                }}>
                                    <input
                                        className="pc-checkbox"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    Remember me
                                </label>
                                <a
                                    href="#forgot"
                                    onClick={(e) => { e.preventDefault(); alert('Please contact system administrator to reset password.'); }}
                                    style={{
                                        fontSize: 13,
                                        color: '#2563eb',
                                        textDecoration: 'underline',
                                        fontWeight: 500,
                                    }}
                                >
                                    Forgot password?
                                </a>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="pc-btn-primary"
                                style={{ marginTop: 6 }}
                            >
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <span style={{
                                            width: 16,
                                            height: 16,
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: '#ffffff',
                                            borderRadius: '50%',
                                            animation: 'spin 0.7s linear infinite',
                                        }} />
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </form>

                        {/* Quick Demo Access Bar */}
                        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                Quick Demo Logins
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="pc-badge-btn" onClick={() => fillDemo('pharmacist@pharmacy.com', 'Pharma@1234')}>
                                    Pharmacist
                                </button>
                                <button className="pc-badge-btn" onClick={() => fillDemo('owner@pharmacy.com', 'Owner@1234')}>
                                    Owner / Admin
                                </button>
                                <button className="pc-badge-btn" onClick={() => fillDemo('cashier@pharmacy.com', 'Cashier@1234')}>
                                    Cashier
                                </button>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div style={{
                            marginTop: 24,
                            fontSize: 13,
                            color: '#6b7280',
                            textAlign: 'center',
                        }}>
                            Need access? Contact your administrator
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};