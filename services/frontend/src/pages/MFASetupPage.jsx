import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    updateUserAttributes,
    confirmUserAttribute,
    updateMFAPreference
} from 'aws-amplify/auth';
import { getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';

export default function MFASetupPage() {
    const [step, setStep] = useState('prompt'); // 'prompt' | 'enterPhone' | 'verifyCode' | 'complete'
    const [phoneNumber, setPhoneNumber] = useState('');
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

    // User chooses to set up MFA
    const handleSetupMFA = () => {
        setStep('enterPhone');
        setError('');
    };

    // Submit phone number for verification
    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate Singapore phone number format
            const phoneRegex = /^\+65[689]\d{7}$/;
            if (!phoneRegex.test(phoneNumber)) {
                throw new Error('Please enter a valid Singapore phone number (e.g., +6591234567)');
            }

            const cognitoUser = await getUserFromToken();
            
            // Amplify Auth function to set the preferred MFA for Cognito user
            const result = await updateUserAttributes({
                userAttributes: {
                    phone_number: phoneNumber
                }
            });   

            setStep('verifyCode');
        } catch (err) {
            console.error('Phone submission error:', err);
            setError(err.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Verify code and enable MFA
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Verify the phone number with the code
            await confirmUserAttribute({
                userAttributeKey: 'phone_number',
                confirmationCode: verificationCode
            });

            // Enable SMS MFA as preferred method
            await updateMFAPreference({ sms: 'PREFERRED' });

            // Mark user as ACTIVE (onboarding complete with MFA)
            await markUserActive();

            // Show success message
            setStep('complete');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            console.error('Verification error:', err);
            setError('Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Call backend to mark user status as ACTIVE, signifies onboarding complete
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
                    <>
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
                                Would you like to add an extra layer of security with Two-Factor Authentication?
                            </p>
                        </div>

                        <div className="bg-slate-700 p-4 rounded-lg mb-6">
                            <h3 className="text-sm font-semibold text-white mb-2">What is 2FA?</h3>
                            <p className="text-xs sm:text-sm text-slate-300">
                                When you sign in, you'll receive a verification code via SMS to your mobile phone.
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
                                onClick={handleSetupMFA}
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
                    </>
                )}

                {/* STEP 2: Enter Phone Number */}
                {step === 'enterPhone' && (
                    <>
                        <div className="mb-6">
                            <button
                                onClick={() => setStep('prompt')}
                                className="text-slate-400 hover:text-slate-300 flex items-center text-sm mb-4"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                                Enter Your Phone Number
                            </h2>
                            <p className="text-sm sm:text-base text-slate-300">
                                We'll send a verification code to your Singapore mobile number.
                            </p>
                        </div>

                        <form onSubmit={handlePhoneSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                                    Mobile Number
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+6591234567"
                                    className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                    disabled={loading}
                                />
                                <p className="mt-2 text-xs text-slate-400">
                                    Format: +65 followed by 8 digits starting with 6, 8, or 9
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                                    <p className="text-sm text-red-200">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !phoneNumber}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending Code...' : 'Send Verification Code'}
                            </button>
                        </form>
                    </>
                )}

                {/* STEP 3: Verify Code */}
                {step === 'verifyCode' && (
                    <>
                        <div className="mb-6">
                            <button
                                onClick={() => setStep('enterPhone')}
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
                                We've sent a 6-digit code to <span className="font-semibold text-white">{phoneNumber}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                                Didn't receive the code? Go back and try again.
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