'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { META_CONFIG } from '@/lib/meta-config';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink, QrCode, Smartphone, Sparkles, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface EmbeddedSignupButtonProps {
  onSuccess?: (connection: any) => void;
  onError?: (errorMsg: string) => void;
}

type OnboardingStage =
  | 'IDLE'
  | 'SDK_INITIALIZING'
  | 'WAITING_FOR_META'
  | 'ACCOUNT_DETECTED'
  | 'SAVING_CONNECTION'
  | 'SUCCESS'
  | 'ERROR';

export function EmbeddedSignupButton({ onSuccess, onError }: EmbeddedSignupButtonProps) {
  const router = useRouter();
  const [stage, setStage] = useState<OnboardingStage>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    wabaId?: string;
    phoneNumberId?: string;
    businessId?: string;
  }>({});

  const isSdkLoadedRef = useRef(false);

  // 1. Initialize Meta JS SDK and postMessage listener
  useEffect(() => {
    // Load Meta JS SDK if not already in document
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }

    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId: META_CONFIG.APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: META_CONFIG.JS_SDK_VERSION || 'v26.0',
        });
        isSdkLoadedRef.current = true;
        console.log('[Meta SDK] Facebook JavaScript SDK v26.0 initialized successfully');
      } catch (err) {
        console.warn('[Meta SDK] Initialization error:', err);
      }
    };

    // 2. PostMessage event listener for Meta Embedded Signup Session Info
    const handleMetaMessage = (event: MessageEvent) => {
      // Strictly validate event origin
      if (event.origin !== 'https://www.facebook.com') {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[Meta Embedded Signup] Received WA_EMBEDDED_SIGNUP event:', data.event);

          if (data.event === 'FINISH' || data.event === 'SESSION_INFO') {
            const capturedWabaId = data.data?.waba_id || data.data?.wabaId;
            const capturedPhoneId = data.data?.phone_number_id || data.data?.phoneNumberId;
            const capturedBizId = data.data?.business_id || data.data?.businessId;

            if (capturedWabaId || capturedPhoneId) {
              setSessionData((prev) => ({
                ...prev,
                wabaId: capturedWabaId || prev.wabaId,
                phoneNumberId: capturedPhoneId || prev.phoneNumberId,
                businessId: capturedBizId || prev.businessId,
              }));
              setStage('ACCOUNT_DETECTED');
            }
          } else if (data.event === 'CANCEL') {
            console.log('[Meta Embedded Signup] User cancelled signup popup');
            setStage('IDLE');
          }
        }
      } catch (error) {
        // non-JSON message from other origins
      }
    };

    window.addEventListener('message', handleMetaMessage);
    return () => {
      window.removeEventListener('message', handleMetaMessage);
    };
  }, []);

  // 3. Launch Embedded Signup
  const handleLaunchSignup = () => {
    setErrorMessage(null);
    setStage('WAITING_FOR_META');

    if (typeof window === 'undefined' || !window.FB) {
      console.warn('[Meta SDK] FB SDK not loaded, attempting fallback...');
      handleFallbackSignup();
      return;
    }

    try {
      window.FB.login(
        (response: any) => {
          console.log('[Meta Embedded Signup] FB.login response:', response);

          if (response.authResponse?.code) {
            const authCode = response.authResponse.code;
            handleExchangeCode(authCode);
          } else {
            console.warn('[Meta Embedded Signup] Authorization code not returned or user cancelled');
            setStage('ERROR');
            setErrorMessage('Meta authorization was cancelled or did not return an authorization code.');
            if (onError) onError('Meta authorization cancelled');
          }
        },
        {
          config_id: META_CONFIG.EMBEDDED_SIGNUP_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            version: META_CONFIG.EMBEDDED_SIGNUP_VERSION || 'v4',
            sessionInfoVersion: META_CONFIG.SESSION_INFO_VERSION || '3',
            featureType: META_CONFIG.EMBEDDED_SIGNUP_FEATURE_TYPE || 'whatsapp_business_app_onboarding',
          },
        }
      );
    } catch (err: any) {
      console.error('[Meta Embedded Signup] Launch exception:', err);
      handleFallbackSignup();
    }
  };

  // 4. Server-to-server exchange of authorization code
  const handleExchangeCode = async (code: string) => {
    setStage('SAVING_CONNECTION');

    try {
      const payload = {
        code,
        wabaId: sessionData.wabaId || 'default',
        phoneNumberId: sessionData.phoneNumberId || 'default',
        businessId: sessionData.businessId,
        redirectUri: window.location.href.split('?')[0],
      };

      const res = await fetch('/api/v1/whatsapp/embedded-signup/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server failed to exchange Meta authorization token');
      }

      setStage('SUCCESS');
      if (onSuccess) onSuccess(data.connection);

      setTimeout(() => {
        router.push('/dashboard/whatsapp');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('[Embedded Signup Exchange Error]', err);
      setStage('ERROR');
      setErrorMessage(err.message || 'Failed to complete connection on server');
      if (onError) onError(err.message);
    }
  };

  // 5. Meta-hosted Fallback URL
  const handleFallbackSignup = () => {
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/whatsapp/connect`
        : window.location.href.split('?')[0]
    );

    const fallbackUrl = `https://www.facebook.com/${META_CONFIG.GRAPH_API_VERSION}/dialog/oauth?client_id=${META_CONFIG.APP_ID}&redirect_uri=${redirectUri}&config_id=${META_CONFIG.EMBEDDED_SIGNUP_CONFIG_ID}&response_type=code&override_default_response_type=true&extras=${encodeURIComponent(
      JSON.stringify({
        version: 'v4',
        sessionInfoVersion: '3',
        featureType: 'whatsapp_business_app_onboarding',
      })
    )}`;

    window.open(fallbackUrl, '_blank', 'width=700,height=750');
  };

  const getStageMessage = () => {
    switch (stage) {
      case 'WAITING_FOR_META':
        return 'Waiting for Meta authorization popup...';
      case 'ACCOUNT_DETECTED':
        return 'WhatsApp Business Account detected... Processing permissions';
      case 'SAVING_CONNECTION':
        return 'Exchanging authorization code securely with Cloud API...';
      case 'SUCCESS':
        return 'Connection Successful! Coexistence mode activated.';
      case 'ERROR':
        return errorMessage || 'Connection failed. Please retry.';
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Action Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          onClick={handleLaunchSignup}
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold shadow-md gap-2.5 px-6"
          disabled={stage === 'WAITING_FOR_META' || stage === 'SAVING_CONNECTION'}
          isLoading={stage === 'WAITING_FOR_META' || stage === 'SAVING_CONNECTION'}
          leftIcon={<Smartphone className="w-5 h-5" />}
        >
          {stage === 'SAVING_CONNECTION' ? 'Saving Connection...' : 'Connect WhatsApp'}
        </Button>

        <button
          type="button"
          onClick={handleFallbackSignup}
          className="text-xs font-medium text-slate-500 hover:text-indigo-600 underline-offset-4 hover:underline flex items-center gap-1 py-2 px-1"
        >
          <span>Open Meta Web Flow directly</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Real-time Status Feedback */}
      {stage !== 'IDLE' && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            stage === 'SUCCESS'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : stage === 'ERROR'
              ? 'bg-rose-50/80 border-rose-200 text-rose-900'
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
          }`}
        >
          {stage === 'SUCCESS' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : stage === 'ERROR' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 text-sm flex-1">
            <p className="font-semibold">{getStageMessage()}</p>
            {sessionData.wabaId && (
              <p className="text-xs opacity-80">
                WABA ID: <span className="font-mono">{sessionData.wabaId}</span>
                {sessionData.phoneNumberId && (
                  <span>
                    {' '}| Phone ID: <span className="font-mono">{sessionData.phoneNumberId}</span>
                  </span>
                )}
              </p>
            )}
            {stage === 'ERROR' && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLaunchSignup}
                  className="bg-white text-xs h-7"
                >
                  Retry Connection
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Guarantee Callout */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Meta Embedded Signup with WhatsApp Business App Coexistence</span>
        </div>
        <p className="leading-relaxed">
          This integration uses Meta’s official <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-[11px] text-slate-700">whatsapp_business_app_onboarding</code> feature. Eligible business numbers can continue using their existing WhatsApp Business mobile app simultaneously with our Cloud API platform.
        </p>
      </div>
    </div>
  );
}
