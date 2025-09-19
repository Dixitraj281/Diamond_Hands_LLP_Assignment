import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPortal from "./pages/AdminPortal";
import UserPortal from "./pages/UserPortal";
import Header from "./components/Header";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/user/:userId" element={<UserPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
