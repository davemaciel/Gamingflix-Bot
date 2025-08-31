import React, { useState, useEffect, useRef } from 'react';
import { Stamp as Steam, Mail, Clock, CheckCircle, AlertCircle, History, Settings, Activity } from 'lucide-react';

// Simulação de estados da aplicação
const APP_STATES = {
  IDLE: 'idle',
  SEARCHING: 'searching', 
  FOUND: 'found',
  SUCCESS: 'success',
  ERROR: 'error'
} as const;

type AppState = typeof APP_STATES[keyof typeof APP_STATES];

interface CodeRequest {
  id: string;
  code: string;
  timestamp: Date;
  status: 'success' | 'error';
  searchTime: number;
}

// Simulador de códigos Steam
class Steam2FASimulator {
  static generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async simulateSearch(): Promise<{ code: string; searchTime: number }> {
    // Simular tempo de busca realista (2-8 segundos)
    const searchTime = Math.random() * 6000 + 2000;
    await new Promise(resolve => setTimeout(resolve, searchTime));
    
    // 95% de chance de sucesso
    if (Math.random() < 0.95) {
      return {
        code: this.generateRandomCode(),
        searchTime: Math.round(searchTime)
      };
    } else {
      throw new Error('Código não encontrado');
    }
  }
}

function App() {
  const [state, setState] = useState<AppState>(APP_STATES.IDLE);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [history, setHistory] = useState<CodeRequest[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('steam-2fa-history');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setHistory(parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    }
  }, []);

  // Salvar histórico no localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('steam-2fa-history', JSON.stringify(history));
    }
  }, [history]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const canRequestCode = () => {
    const now = Date.now();
    return now - lastRequestTime > 60000; // Rate limit: 1 por minuto
  };

  const requestSteamCode = async () => {
    if (!canRequestCode()) {
      showNotification('Aguarde 1 minuto antes de solicitar novamente');
      return;
    }

    if (state === APP_STATES.SEARCHING) return;

    setState(APP_STATES.SEARCHING);
    setCurrentCode('');
    setProgress(0);
    setTimeRemaining(45);
    setLastRequestTime(Date.now());

    // Progress bar e countdown
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / 45000) * 100, 100);
      const remaining = Math.max(45 - Math.floor(elapsed / 1000), 0);
      
      setProgress(progressPercent);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setState(APP_STATES.ERROR);
        showNotification('Timeout: Código não encontrado em 45 segundos');
        
        // Adicionar ao histórico como erro
        const newRequest: CodeRequest = {
          id: Date.now().toString(),
          code: 'TIMEOUT',
          timestamp: new Date(),
          status: 'error',
          searchTime: 45000
        };
        setHistory(prev => [newRequest, ...prev.slice(0, 9)]);
      }
    }, 100);

    // Timeout de 45 segundos
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setState(APP_STATES.ERROR);
    }, 45000);

    try {
      const result = await Steam2FASimulator.simulateSearch();
      
      clearInterval(intervalRef.current!);
      clearTimeout(timeoutRef.current!);
      
      setCurrentCode(result.code);
      setState(APP_STATES.FOUND);
      setProgress(100);
      showNotification('Código encontrado com sucesso!');

      // Adicionar ao histórico
      const newRequest: CodeRequest = {
        id: Date.now().toString(),
        code: result.code,
        timestamp: new Date(),
        status: 'success',
        searchTime: result.searchTime
      };
      setHistory(prev => [newRequest, ...prev.slice(0, 9)]);

      // Auto-limpar após 30 segundos
      setTimeout(() => {
        setState(APP_STATES.SUCCESS);
      }, 30000);

    } catch (error) {
      clearInterval(intervalRef.current!);
      clearTimeout(timeoutRef.current!);
      setState(APP_STATES.ERROR);
      showNotification('Erro: Não foi possível encontrar o código');
      
      const newRequest: CodeRequest = {
        id: Date.now().toString(),
        code: 'ERROR',
        timestamp: new Date(),
        status: 'error',
        searchTime: 0
      };
      setHistory(prev => [newRequest, ...prev.slice(0, 9)]);
    }
  };

  const resetInterface = () => {
    setState(APP_STATES.IDLE);
    setCurrentCode('');
    setProgress(0);
    setTimeRemaining(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const getStatusColor = () => {
    switch (state) {
      case APP_STATES.SEARCHING: return 'text-steam-secondary';
      case APP_STATES.FOUND: return 'text-steam-success';
      case APP_STATES.ERROR: return 'text-steam-error';
      default: return 'text-steam-accent';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case APP_STATES.IDLE: return 'Sistema online - Pronto para buscar';
      case APP_STATES.SEARCHING: return 'Buscando código Steam em emails...';
      case APP_STATES.FOUND: return 'Código encontrado e pronto para uso';
      case APP_STATES.SUCCESS: return 'Operação concluída com sucesso';
      case APP_STATES.ERROR: return 'Erro na busca - Tente novamente';
      default: return 'Sistema online';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steam-dark via-steam-primary to-steam-dark text-white">
      {/* Header */}
      <header className="bg-steam-primary/50 backdrop-blur-sm border-b border-steam-accent/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gamingflix-red rounded-lg flex items-center justify-center">
                <Steam className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gamingflix</h1>
                <p className="text-sm text-steam-accent">Steam 2FA Automático</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Online</span>
              </div>
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-3 py-2 bg-steam-accent/10 rounded-lg hover:bg-steam-accent/20 transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Histórico</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 bg-steam-success text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          {notification}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-steam-primary/30 backdrop-blur-sm rounded-2xl p-6 border border-steam-accent/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Status do Sistema</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-steam-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-steam-success">Ativo</span>
                </div>
              </div>
              
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
              
              {state === APP_STATES.SEARCHING && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso da busca</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-steam-dark rounded-full h-2">
                    <div 
                      className="bg-steam-secondary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center space-x-2 text-steam-accent">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Timeout em {timeRemaining}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Main Action */}
            <div className="bg-steam-primary/30 backdrop-blur-sm rounded-2xl p-8 border border-steam-accent/20 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gamingflix-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Steam className="w-10 h-10 text-gamingflix-red" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Solicitar Código Steam</h2>
                <p className="text-steam-accent">
                  Busca automática em emails com entrega instantânea
                </p>
              </div>

              {state === APP_STATES.FOUND && currentCode && (
                <div className="mb-6 p-6 bg-steam-success/10 border border-steam-success/30 rounded-xl">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-steam-success" />
                    <span className="text-steam-success font-medium">Código Encontrado</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-steam-success mb-2 tracking-widest">
                    {currentCode}
                  </div>
                  <p className="text-sm text-steam-accent">
                    Código válido por 5 minutos - Copie agora
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={requestSteamCode}
                  disabled={state === APP_STATES.SEARCHING || !canRequestCode()}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
                    ${state === APP_STATES.SEARCHING 
                      ? 'bg-steam-accent/20 text-steam-accent cursor-not-allowed' 
                      : canRequestCode()
                        ? 'bg-gamingflix-red hover:bg-gamingflix-accent text-white hover:shadow-lg hover:scale-105'
                        : 'bg-steam-accent/20 text-steam-accent cursor-not-allowed'
                    }
                  `}
                >
                  {state === APP_STATES.SEARCHING ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Buscando...</span>
                    </div>
                  ) : !canRequestCode() ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Aguarde {Math.ceil((60000 - (Date.now() - lastRequestTime)) / 1000)}s</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Mail className="w-5 h-5" />
                      <span>Buscar Código</span>
                    </div>
                  )}
                </button>

                {(state === APP_STATES.FOUND || state === APP_STATES.ERROR) && (
                  <button
                    onClick={resetInterface}
                    className="w-full py-2 px-4 text-sm bg-steam-accent/10 hover:bg-steam-accent/20 rounded-lg transition-colors"
                  >
                    Solicitar Novo Código
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-steam-primary/30 backdrop-blur-sm rounded-2xl p-6 border border-steam-accent/20">
              <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-steam-accent">Total de códigos:</span>
                  <span className="font-semibold">{history.filter(h => h.status === 'success').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steam-accent">Taxa de sucesso:</span>
                  <span className="font-semibold">
                    {history.length > 0 
                      ? Math.round((history.filter(h => h.status === 'success').length / history.length) * 100)
                      : 0
                    }%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steam-accent">Último código:</span>
                  <span className="font-semibold">
                    {history[0]?.timestamp 
                      ? new Date(history[0].timestamp).toLocaleTimeString()
                      : 'Nenhum'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Recent History */}
            {(showHistory || history.length > 0) && (
              <div className="bg-steam-primary/30 backdrop-blur-sm rounded-2xl p-6 border border-steam-accent/20">
                <h3 className="text-lg font-semibold mb-4">Histórico Recente</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {history.slice(0, 5).map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-steam-dark/30 rounded-lg"
                    >
                      <div>
                        <div className="font-mono text-sm">
                          {request.status === 'success' ? request.code : '-----'}
                        </div>
                        <div className="text-xs text-steam-accent">
                          {request.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`
                        w-2 h-2 rounded-full
                        ${request.status === 'success' ? 'bg-steam-success' : 'bg-steam-error'}
                      `}></div>
                    </div>
                  ))}
                  
                  {history.length === 0 && (
                    <div className="text-center text-steam-accent py-4">
                      Nenhum código solicitado ainda
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-steam-primary/30 backdrop-blur-sm rounded-2xl p-6 border border-steam-accent/20">
              <h3 className="text-lg font-semibold mb-4">Como Funciona</h3>
              <div className="space-y-3 text-sm text-steam-accent">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gamingflix-red rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                  <p>Clique em "Buscar Código" para iniciar</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gamingflix-red rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                  <p>Sistema busca automaticamente em emails</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gamingflix-red rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                  <p>Código é exibido em até 45 segundos</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-gamingflix-red rounded-full flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                  <p>Copie e use no Steam imediatamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;