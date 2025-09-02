import React from "react";

type ErrorBoundaryState = { 
  hasError: boolean; 
  msg?: string 
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  
  static getDerivedStateFromError(e: unknown) { 
    return { hasError: true, msg: (e as any)?.message }; 
  }
  
  render() { 
    return this.state.hasError ? (
      <div className="p-4 border rounded-xl bg-rose-50 text-rose-900">
        Something went wrong: {this.state.msg}
      </div>
    ) : this.props.children; 
  }
}