import React from "react";

const UserAddFormSelect = ({
  label,
  name,
  value,
  onChange,
  error,
  options,
}) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
        error ? "border-red-500" : ""
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export default UserAddFormSelect;
