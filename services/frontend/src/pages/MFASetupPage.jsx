import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserFromToken, getAccessToken } from '../services/authService';
import { userApi } from '../services/apiService';
import { updateMFAPreference } from 'aws-amplify/auth';
import QRCode from 'qrcode';

export default function MFASetupPage() {
    const [step, setStep] = useState('prompt'); // 'prompt' | 'scanQR' | 'verifyCode' | 'complete'
    const [qrCode, setQrCode] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // User chooses to skip MFA
    const handleSkip = async () => {
        try {
            setLoading(true);
            setError('');

            // Mark user as ACTIVE (onboarding complete without MFA)
            await markUserActive();

            // Redirect to dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Skip MFA error:', err);
            setError('Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // User chooses to set up TOTP - call backend to associate software token
    const handleSetupTOTP = async () => {
        try {
            setLoading(true);
            setError('');

            // Get access token from Amplify session
            const accessToken = await getAccessToken();
            if (!accessToken) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Call backend to associate software token
            const response = await userApi.associateTOTP(accessToken);

            // Extract data from API response structure
            const data = response.data?.data || response.data;
            const { secretCode, qrCodeUri } = data;

            if (!secretCode || !qrCodeUri) {
                throw new Error('Invalid response from server. Missing secret code or QR code URI.');
            }

            // Generate QR code image from URI
            // Use a QR code library or service to convert URI to image
            // For now, we'll use a simple approach with qrcode.js or online service
            const qrCodeImageUrl = await generateQRCode(qrCodeUri);

            setQrCode(qrCodeImageUrl);
            setSecretKey(secretCode);
            setStep('scanQR');
        } catch (err) {
            console.error('TOTP setup error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to start TOTP setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Generate QR code image from URI
    const generateQRCode = async (qrCodeUri) => {
        try {
            // Generate QR code as data URL (client-side, no external calls)
            const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUri, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataUrl;
        } catch (err) {
            console.error('Failed to generate QR code:', err);
            throw new Error('Failed to generate QR code');
        }
    };

    // Verify the TOTP code from authenticator app
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Get access token
            const accessToken = await getAccessToken();
            if (!accessToken) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Verify the TOTP code via backend
            await userApi.verifyTOTP(accessToken, verificationCode);

            // Set TOTP as preferred MFA method via Amplify
            await updateMFAPreference({
                totp: 'PREFERRED'
            });

            // Mark user as ACTIVE (onboarding complete with TOTP)
            await markUserActive();

            // Show success message
            setStep('complete');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            console.error('Verification error:', err);
            setError(err.response?.data?.message || err.message || 'Invalid verification code. Please make sure you entered the current code from your authenticator app.');
        } finally {
            setLoading(false);
        }
    };

    // Call backend to mark user status as ACTIVE
    const markUserActive = async () => {
        try {
            const cognitoUser = await getUserFromToken();
            await userApi.setUpMFAForUser(cognitoUser.sub);
        } catch (err) {
            console.error('Mark active error:', err);
            throw err;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">

                {/* STEP 1: Initial Prompt */}
                {step === 'prompt' && (
                    <div>
                        <div className="text-center mb-6">
                            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                                Secure Your Account
                            </h2>
                            <p className="text-sm sm:text-base text-slate-300">
                                Add an extra layer of security with Two-Factor Authentication using an authenticator app.
                            </p>
                        </div>

                        <div className="bg-slate-700 p-4 rounded-lg mb-6">
                            <h3 className="text-sm font-semibold text-white mb-2">What is 2FA?</h3>
                            <p className="text-xs sm:text-sm text-slate-300 mb-2">
                                When you sign in, you'll need to enter a verification code from your authenticator app (like Microsoft Authenticator or Google Authenticator).
                            </p>
                            <p className="text-xs sm:text-sm text-slate-300">
                                This ensures that only you can access your account, even if someone knows your password.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={handleSetupTOTP}
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Set Up 2FA (Recommended)
                            </button>
                            <button
                                onClick={handleSkip}
                                disabled={loading}
                                className="w-full py-3 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Skip for Now'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Scan QR Code */}
                {step === 'scanQR' && (
                    <>
                        <div className="mb-6">
                            <button
                                onClick={() => setStep('prompt')}
                                className="text-slate-400 hover:text-slate-300 flex items-center text-sm mb-4"
                                disabled={loading}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                                Scan QR Code
                            </h2>
                            <p className="text-sm sm:text-base text-slate-300 mb-4">
                                Open Microsoft Authenticator (or Google Authenticator) and scan this QR code:
                            </p>
                        </div>

                        {/* QR Code Display */}
                        <div className="mb-6 flex justify-center">
                            <div className="bg-white p-4 rounded-lg">
                                {qrCode ? (
                                    <img
                                        src={qrCode}
                                        alt="TOTP QR Code"
                                        className="w-48 h-48"
                                    />
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                                        Loading QR code...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Manual Entry Option */}
                        <div className="bg-slate-700 p-4 rounded-lg mb-6">
                            <p className="text-xs text-slate-300 mb-2">
                                Can't scan? Enter this code manually:
                            </p>
                            <div className="flex items-center justify-between">
                                <code className="text-sm font-mono text-white bg-slate-800 px-3 py-2 rounded flex-1 break-all">
                                    {secretKey}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(secretKey);
                                    }}
                                    className="ml-2 px-3 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 whitespace-nowrap"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 text-center mb-4">
                            After scanning, click Continue and enter the 6-digit code from your app.
                        </p>

                        <button
                            onClick={() => setStep('verifyCode')}
                            disabled={loading || !qrCode}
                            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    </>
                )}

                {/* STEP 3: Verify Code */}
                {step === 'verifyCode' && (
                    <>
                        <div className="mb-6">
                            <button
                                onClick={() => setStep('scanQR')}
                                className="text-slate-400 hover:text-slate-300 flex items-center text-sm mb-4"
                                disabled={loading}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                                Enter Verification Code
                            </h2>
                            <p className="text-sm sm:text-base text-slate-300 mb-4">
                                Enter the 6-digit code from your authenticator app to verify setup.
                            </p>
                        </div>

                        <form onSubmit={handleVerifyCode} className="space-y-4">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-slate-300 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="w-full px-4 py-3 bg-slate-700 text-white text-center text-2xl tracking-widest border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                    required
                                    disabled={loading}
                                    autoComplete="one-time-code"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                                    <p className="text-sm text-red-200">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || verificationCode.length !== 6}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                            </button>
                        </form>
                    </>
                )}

                {/* STEP 4: Complete */}
                {step === 'complete' && (
                    <div className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                            All Set!
                        </h2>
                        <p className="text-sm sm:text-base text-slate-300 mb-4">
                            Two-Factor Authentication has been enabled for your account.
                        </p>
                        <p className="text-xs text-slate-400">
                            Redirecting to dashboard...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
