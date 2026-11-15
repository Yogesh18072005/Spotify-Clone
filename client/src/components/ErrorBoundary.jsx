import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Melody UI error:", error, info); }
  render() {
    if (this.state.hasError) return <main className="app-error"><h1>Melody ran into a problem</h1><p>Refresh the page to try again. Your account and saved library are not deleted.</p><button onClick={() => window.location.reload()}>Refresh Melody</button></main>;
    return this.props.children;
  }
}
