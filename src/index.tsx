import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props to fix TS errors
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Erro desconhecido";
      try {
          // Robustly get error message
          errorMessage = this.state.error instanceof Error ? this.state.error.toString() : String(this.state.error);
      } catch (e) {
          errorMessage = "Erro crítico (não foi possível converter o erro para string)";
      }

      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{color: '#ef4444'}}>Algo deu errado.</h1>
          <p>Ocorreu um erro ao carregar a aplicação.</p>
          <pre style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', overflow: 'auto', textAlign: 'left', maxWidth: '800px', margin: '20px auto' }}>
            {errorMessage}
          </pre>
          <button 
            onClick={() => {
                localStorage.clear(); 
                window.location.reload();
            }}
            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Limpar Dados Locais e Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);