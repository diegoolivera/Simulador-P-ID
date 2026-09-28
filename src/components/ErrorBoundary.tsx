import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /**
   * Optional escape hatch for failures retrying cannot fix (a corrupted
   * persisted layout, a bad selector in an effect). Without it, "Reintentar"
   * just re-renders the same crashing tree.
   */
  recoverLabel?: string;
  onRecover?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for render-time and effect-time failures (a malformed
 * persisted P&ID layout, a bad `document.querySelector` selector, ...). Without
 * it React unmounts the whole tree and the user gets a blank page with no
 * explanation.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Simulador] render error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    const { recoverLabel, onRecover } = this.props;
    if (!error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '48px auto' }}>
        <h1 style={{ fontSize: 18 }}>El simulador dejó de responder</h1>
        <p style={{ fontSize: 13 }}>{error.message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => this.setState({ error: null })}>Reintentar</button>
          {onRecover && <button onClick={onRecover}>{recoverLabel ?? 'Recuperar'}</button>}
        </div>
      </div>
    );
  }
}
