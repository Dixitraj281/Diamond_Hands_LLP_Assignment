import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="logo">📊 021.Trade </div>
        <nav className="nav-links">
          <Link
            to="/admin"
            className={`nav-link ${location.pathname.startsWith("/admin") ? "active" : ""}`}
          >
            Admin Portal
          </Link>
          <Link
            to="/user/demo-user-id"
            className={`nav-link ${location.pathname.startsWith("/user") ? "active" : ""}`}
          >
            User Portal
          </Link>
        </nav>
      </div>
    </header>
  );
}
