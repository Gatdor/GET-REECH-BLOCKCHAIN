// src/components/PageWrapper.jsx
import React from "react";

const PageWrapper = ({ title, children }) => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm">{children}</div>
    </div>
  );
};

export default PageWrapper;
