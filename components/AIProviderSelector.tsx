import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AIProviderConfig, AIProviderId, getProviderOption, listAIProviderModels, PROVIDER_OPTIONS, testAIProviderConnection } from '../services/aiProvider';

interface AIProviderSelectorProps {
  config: AIProviderConfig;
  onChange: (config: AIProviderConfig) => void;
}

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ config, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsState, setModelsState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const option = getProviderOption(config.provider);
  const popupRef = useRef<Window | null>(null);
  const [signedInProvider, setSignedInProvider] = useState<string | null>(null);
  const [signedInToken, setSignedInToken] = useState<string | null>(null);
  const [keychainState, setKeychainState] = useState<'idle' | 'loading' | 'loaded' | 'unavailable'>('idle');
  const keychainCredentials = useRef(new Map<'openai' | 'gemini', string>());
  const providerChangeSequence = useRef(0);

  const modelOptions = useMemo(() => {
    const source = availableModels.length > 0 ? availableModels : option.models;
    return source.includes(config.model) ? source : [config.model, ...source];
  }, [availableModels, config.model, option.models]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      // Received an OAuth/SDK token from the helper popup or extension bridge.
      // For security and API contract reasons we DO NOT treat SDK/session tokens as
      // direct OpenAI Responses API bearer credentials. Save the SDK token locally
      // for developer convenience but do not write it into the provider apiKey.
      if (ev?.data && ev.data.type === 'oauth_token' && ev.data.token) {
        setSignedInProvider(ev.data.provider || 'openai');
        setSignedInToken(ev.data.token);
        // Mark that SDK login is enabled in runtime config but do NOT populate apiKey
        onChange({ ...config, useSdkLogin: true });
        setTestState('success');
        setTestMessage(`Signed in via ${ev.data.provider || 'SDK'} (note: session tokens are NOT usable as OpenAI API keys)`);
        if (popupRef.current) try { popupRef.current.close(); } catch {};
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [config, onChange]);

  const startSdkSignIn = () => {
    try {
      const url = (import.meta.env.VITE_AUTH_SERVER_URL || 'http://127.0.0.1:1236') + '/auth/start?provider=google';
      popupRef.current = window.open(url, 'oauth', 'width=600,height=700');
      setTestState('testing');
      setTestMessage('Waiting for sign-in...');
    } catch (err) {
      setTestState('error');
      setTestMessage('Failed to open sign-in window.');
    }
  };

  const unlinkSdk = () => {
    setSignedInProvider(null);
    setSignedInToken(null);
    onChange({ ...config, useSdkLogin: false, apiKey: '' });
    setTestState('idle');
    setTestMessage('');
  };

  const linkOpenAIApiKey = () => {
    const key = window.prompt('Paste your OpenAI API key (will be stored only in this browser session)');
    if (key && key.trim()) {
      onChange({ ...config, apiKey: key.trim(), useSdkLogin: true });
      setTestState('success');
      setTestMessage('OpenAI API key linked');
    }
  };

  const keychainProviderFor = (provider: AIProviderId, endpoint: string): 'openai' | 'gemini' | null => {
    if (provider === 'openai' || (provider === 'openai-compatible' && /^https:\/\/api\.openai\.com\//i.test(endpoint))) return 'openai';
    if (provider === 'gemini') return 'gemini';
    return null;
  };

  const loadKeychainCredential = async (provider: 'openai' | 'gemini'): Promise<string | null> => {
    const cached = keychainCredentials.current.get(provider);
    if (cached) return cached;
    setKeychainState('loading');
    try {
      const bridge = import.meta.env.VITE_AUTH_SERVER_URL || 'http://127.0.0.1:1236';
      const response = await fetch(`${bridge}/credentials/${provider}`, { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Credential unavailable');
      const payload = await response.json() as { apiKey?: string };
      if (!payload.apiKey?.trim()) throw new Error('Credential unavailable');
      keychainCredentials.current.set(provider, payload.apiKey.trim());
      setKeychainState('loaded');
      return payload.apiKey.trim();
    } catch {
      setKeychainState('unavailable');
      return null;
    }
  };

  useEffect(() => {
    const credentialProvider = keychainProviderFor(config.provider, config.endpoint);
    if (!credentialProvider || config.apiKey?.trim()) return;
    const changeSequence = ++providerChangeSequence.current;
    let cancelled = false;
    void loadKeychainCredential(credentialProvider).then(apiKey => {
      if (apiKey && !cancelled && changeSequence === providerChangeSequence.current) {
        onChange({ ...config, apiKey });
      }
    });
    return () => { cancelled = true; };
  }, [config.provider, config.endpoint, config.apiKey]);

  const retryKeychainCredential = async () => {
    const credentialProvider = keychainProviderFor(config.provider, config.endpoint);
    if (!credentialProvider) return;
    keychainCredentials.current.delete(credentialProvider);
    const changeSequence = ++providerChangeSequence.current;
    const apiKey = await loadKeychainCredential(credentialProvider);
    if (apiKey && changeSequence === providerChangeSequence.current) onChange({ ...config, apiKey });
  };

  const updateProvider = (provider: AIProviderId) => {
    ++providerChangeSequence.current;
    const next = getProviderOption(provider);
    const nextConfig = {
      ...config,
      provider,
      endpoint: next.endpoint,
      model: next.models[0],
      useSdkLogin: provider === 'openai' ? config.useSdkLogin : false,
      apiKey: '',
    };
    onChange(nextConfig);
    if (!keychainProviderFor(provider, next.endpoint)) {
      setKeychainState('idle');
    }
    setTestState('idle');
    setAvailableModels([]);
    setModelsState('idle');
  };

  const refreshModels = async () => {
    setModelsState('loading');
    try {
      const models = await listAIProviderModels(config);
      setAvailableModels(models);
      if (!models.includes(config.model)) onChange({ ...config, model: models[0] });
      setModelsState('success');
    } catch (error) {
      setModelsState('error');
      setTestMessage(error instanceof Error ? error.message : 'Could not load models.');
    }
  };

  const testConnection = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      const response = await testAIProviderConnection(config);
      setTestState('success');
      setTestMessage(response.slice(0, 80));
    } catch (error) {
      setTestState('error');
      setTestMessage(error instanceof Error ? error.message : 'Connection test failed.');
    }
  };

  return (
    <div className="relative flex items-center gap-2" onClick={event => event.stopPropagation()}>
      <button type="button" onClick={() => setIsOpen(value => !value)} className="flex items-center gap-2 rounded-lg border-2 border-brand-primary bg-brand-bg px-3 py-2 text-left text-xs shadow-[0_0_12px_rgba(0,169,157,0.25)] hover:bg-brand-primary/20" aria-expanded={isOpen} aria-label="AI provider settings">
        <span className="font-bold uppercase tracking-wide text-brand-primary">AI MODEL:</span>
        <span className="font-semibold text-brand-text">{option.label}</span>
        <span className="max-w-[10rem] truncate text-brand-text-muted">{config.model}</span>
        <span className="text-brand-text-muted">▾</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-[22rem] rounded-lg border border-brand-border bg-brand-surface p-4 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="font-semibold text-brand-text">AI provider</p><p className="text-[11px] text-brand-text-muted">Global runtime setting; not saved with projects.</p></div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-brand-text-muted hover:text-brand-text" aria-label="Close provider settings">×</button>
          </div>
          <div className="mb-3">
            <p className="font-semibold text-brand-text">Provider</p>
            <p className="text-[11px] text-brand-text-muted">Choose runtime type</p>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="radio" name="providerType" checked={config.provider === 'lmstudio'} onChange={() => updateProvider('lmstudio')} />
                <span className="ml-1">Local (LM Studio)</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="radio" name="providerType" checked={config.provider !== 'lmstudio'} onChange={() => {
                  const defaultCloud = config.provider === 'lmstudio' ? 'openai' : config.provider;
                  updateProvider(defaultCloud as AIProviderId);
                }} />
                <span className="ml-1">Cloud provider</span>
              </label>
            </div>
          </div>

          {config.provider !== 'lmstudio' && (
            <label className="mb-3 block text-xs text-brand-text-muted">Cloud provider
              <select value={config.provider} onChange={event => updateProvider(event.target.value as AIProviderId)} className="mt-1 w-full rounded border border-brand-border bg-brand-bg p-2 text-brand-text">
                {PROVIDER_OPTIONS.filter(p => p.id !== 'lmstudio').map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
              </select>
            </label>
          )}

          <label className="mb-3 block text-xs text-brand-text-muted">Model
            <select value={config.model} onChange={event => onChange({ ...config, model: event.target.value })} className="mt-1 w-full rounded border border-brand-border bg-brand-bg p-2 text-brand-text">
              {modelOptions.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          {(config.provider === 'lmstudio' || config.provider === 'openai-compatible' || config.provider === 'openai') && <button type="button" onClick={refreshModels} disabled={modelsState === 'loading'} className="mb-3 w-full rounded border border-brand-primary px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 disabled:opacity-50">{modelsState === 'loading' ? 'Loading models…' : 'Refresh available models'}</button>}
          <label className="mb-3 block text-xs text-brand-text-muted">Custom model ID <span className="text-brand-text-muted">(optional)</span>
            <input value={config.model} onChange={event => onChange({ ...config, model: event.target.value })} className="mt-1 w-full rounded border border-brand-border bg-brand-bg p-2 text-brand-text" spellCheck={false} placeholder="Enter any supported model ID" />
          </label>
          {config.provider === 'openai-compatible' && <label className="mb-3 block text-xs text-brand-text-muted">Endpoint
            <input value={config.endpoint} onChange={event => onChange({ ...config, endpoint: event.target.value })} className="mt-1 w-full rounded border border-brand-border bg-brand-bg p-2 text-brand-text" spellCheck={false} />
          </label>}
          {config.provider !== 'lmstudio' && (
            <>
              {config.provider === 'openai' && (
                <div className="mb-3 rounded border border-brand-border/60 bg-brand-bg/50 p-2">
                  <label className="flex items-center gap-2 text-xs text-brand-text-muted">
                    <input
                      type="checkbox"
                      checked={!!config.useSdkLogin}
                      onChange={event => onChange({ ...config, useSdkLogin: event.target.checked })}
                    />
                    <span>Use SDK / Browser Extension Bridge</span>
                  </label>

                  {config.useSdkLogin && (
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={startSdkSignIn}
                        className="w-full rounded border border-brand-primary px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10"
                      >
                        Sign in with Google / Bridge
                      </button>
                      <p className="text-[10px] text-brand-text-muted">
                        Or open <a href="https://chatgpt.com" target="_blank" rel="noreferrer" className="text-brand-primary underline">chatgpt.com</a> with the Dev Doctor extension loaded to auto-bridge your session.
                      </p>
                    </div>
                  )}

                  {signedInProvider && (
                    <div className="mt-2 rounded border border-green-500/30 bg-green-500/10 p-2 text-xs text-green-300">
                      <div className="font-semibold text-xs">Signed in with {signedInProvider}</div>
                      <div className="mt-1 flex gap-2">
                        <button type="button" onClick={linkOpenAIApiKey} className="rounded border border-brand-primary px-2 py-0.5 text-[10px] text-brand-primary hover:bg-brand-primary/10">Paste / Replace Key</button>
                        <button type="button" onClick={unlinkSdk} className="rounded border border-red-400 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10">Unlink</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* API Key field is always visible for Gemini, Claude, OpenAI-compatible, and OpenAI (when not using SDK login or as direct entry) */}
              {(!config.useSdkLogin || config.provider !== 'openai') && (
                <label className="mb-3 block text-xs text-brand-text-muted">{option.label} API key <span className="text-yellow-400">(browser session only)</span>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={event => onChange({ ...config, apiKey: event.target.value })}
                    placeholder={`Enter ${option.label} API key`}
                    className="mt-1 w-full rounded border border-brand-border bg-brand-bg p-2 text-brand-text"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}

              {keychainState === 'loading' && <p className="mb-3 text-xs text-brand-text-muted">Loading credential from macOS Keychain…</p>}
              {keychainState === 'loaded' && <p className="mb-3 text-xs text-green-400">Credential loaded from macOS Keychain for this app session.</p>}
              {keychainState === 'unavailable' && (
                <div className="mb-3 rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-300">
                  <p>Keychain credential unavailable. Start the local credential bridge or paste a session-only key.</p>
                  <button type="button" onClick={retryKeychainCredential} className="mt-2 rounded border border-yellow-400 px-2 py-1 font-semibold hover:bg-yellow-500/10">Retry Keychain</button>
                </div>
              )}

              {(!config.useSdkLogin || config.provider !== 'openai') && !config.apiKey?.trim() && (
                <p className="mb-3 text-xs text-yellow-400">Enter your {option.label} API key to enable requests.</p>
              )}
            </>
          )}
          <button type="button" onClick={testConnection} disabled={testState === 'testing'} className="w-full rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{testState === 'testing' ? 'Testing…' : 'Test connection'}</button>
          {testState !== 'idle' && <p className={`mt-2 text-xs ${testState === 'success' ? 'text-green-400' : testState === 'error' ? 'text-red-400' : 'text-brand-text-muted'}`} role="status">{testState === 'success' ? `Success: ${testMessage}` : testMessage}</p>}
          <p className="mt-3 text-[10px] leading-4 text-brand-text-muted">Cloud provider keys are held in memory only and are never added to project history, exports, or service logs. A production deployment should use a server-side proxy.</p>
        </div>
      )}
    </div>
  );
};