import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Legalhubly hit an unexpected error. Your data is safe — try reloading this page.
          </p>
          {(import.meta.env.DEV || this.state.message) && (
            <p className="text-xs text-muted-foreground break-words border rounded-lg p-2 bg-muted/40">
              {this.state.message || "Unknown error"}
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={this.handleReload}>Reload page</Button>
            <Button variant="outline" onClick={this.handleHome}>
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
