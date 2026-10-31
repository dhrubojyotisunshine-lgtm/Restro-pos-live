import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { MdDashboard, MdInventory, MdSubscriptions, MdSettings } from "react-icons/md";
import {
  FaShoppingCart, FaUtensils, FaUsers, FaChartBar, FaTools,
  FaUserTie, FaTrashAlt, FaLock, FaCashRegister, FaCalendarAlt,
  FaArrowLeft, FaSave, FaBuilding, FaChevronDown, FaChevronUp,
} from "react-icons/fa";
import { GiCook } from "react-icons/gi";

const MODULE_ICONS = {
  manage_order:         <FaShoppingCart />,
  reservation:          <FaCalendarAlt />,
  purchase_manage:      <FaShoppingCart />,
  food_management:      <FaUtensils />,
  recipe_management:    <GiCook />,
  inventory_management: <MdInventory />,
  loyalty:              <MdSubscriptions />,
  roles_permission:     <FaLock />,
  user_staff:           <FaUsers />,
  report:               <FaChartBar />,
  master_setup:         <FaTools />,
  human_resource:       <FaUserTie />,
  waste_tracking:       <FaTrashAlt />,
  setting:              <MdSettings />,
  pos:                  <FaCashRegister />,
};

const PERM_COLS = ["can_view", "can_create", "can_edit", "can_delete", "can_print", "can_export", "can_manage"];
const PERM_LABELS = ["VIEW", "CREATE", "EDIT", "DELETE", "PRINT", "EXPORT", "MANAGE"];

const Toggle = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? "bg-[#4CBBA1]" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

const ModuleAllocation = () => {
  const { adminId } = useParams();
  const [searchParams] = useSearchParams();
  const companyName = searchParams.get("name") || "Company";
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");

  const [modules, setModules] = useState([]);
  const [subFeatures, setSubFeatures] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/module-allocation/${adminId}`, { headers: { Authorization: token } }),
      axios.get(`${API_BASE_URL}/module-allocation/sub-features/${adminId}`, { headers: { Authorization: token } }),
    ])
      .then(([modRes, sfRes]) => {
        setModules(modRes.data.data || []);
        setSubFeatures(sfRes.data.data || []);
      })
      .catch(() => toast.error("Failed to load module allocation"))
      .finally(() => setLoading(false));
  }, [adminId]);

  const toggleModule = (index) => {
    setModules((prev) =>
      prev.map((m, i) => (i === index ? { ...m, is_enabled: m.is_enabled ? 0 : 1 } : m))
    );
  };

  const toggleAll = (enabled) => {
    setModules((prev) => prev.map((m) => ({ ...m, is_enabled: enabled ? 1 : 0 })));
  };

  const toggleExpand = (moduleKey) => {
    setExpanded((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const expandAll = () => {
    const all = {};
    subFeatures.forEach((m) => { all[m.module_key] = true; });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  const togglePermission = (moduleKey, sfKey, permCol) => {
    setSubFeatures((prev) =>
      prev.map((mod) => {
        if (mod.module_key !== moduleKey) return mod;
        return {
          ...mod,
          sub_features: mod.sub_features.map((sf) => {
            if (sf.sub_feature_key !== sfKey) return sf;
            return { ...sf, [permCol]: sf[permCol] ? 0 : 1 };
          }),
        };
      })
    );
  };

  const toggleColumnAll = (moduleKey, permCol, newVal) => {
    setSubFeatures((prev) =>
      prev.map((mod) => {
        if (mod.module_key !== moduleKey) return mod;
        return {
          ...mod,
          sub_features: mod.sub_features.map((sf) => {
            if (sf.applicable_perms && !sf.applicable_perms.includes(permCol)) return sf;
            return { ...sf, [permCol]: newVal };
          }),
        };
      })
    );
  };

  const isColumnAllChecked = (sfs, permCol) => {
    const applicable = sfs.filter((sf) => !sf.applicable_perms || sf.applicable_perms.includes(permCol));
    if (applicable.length === 0) return false;
    return applicable.every((sf) => !!sf[permCol]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const flatPerms = subFeatures.flatMap((mod) =>
        mod.sub_features.map((sf) => ({
          module_key:      mod.module_key,
          sub_feature_key: sf.sub_feature_key,
          can_view:   sf.can_view,
          can_create: sf.can_create,
          can_edit:   sf.can_edit,
          can_delete: sf.can_delete,
          can_print:  sf.can_print,
          can_export: sf.can_export,
          can_manage: sf.can_manage,
        }))
      );

      await Promise.all([
        axios.post(`${API_BASE_URL}/module-allocation/${adminId}`, { modules }, { headers: { Authorization: token } }),
        axios.post(`${API_BASE_URL}/module-allocation/sub-features/${adminId}`, { permissions: flatPerms }, { headers: { Authorization: token } }),
      ]);

      toast.success("Module allocation saved successfully");
    } catch {
      toast.error("Failed to save module allocation");
    } finally {
      setSaving(false);
    }
  };

  const onCount  = modules.filter((m) => m.is_enabled).length;
  const offCount = modules.length - onCount;

  const getSubFeaturesForModule = (moduleKey) =>
    subFeatures.find((m) => m.module_key === moduleKey)?.sub_features || [];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1D3E]">
              Manage Features — Module Allocation
            </h1>
            <nav className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <span className="cursor-pointer hover:text-[#4CBBA1]" onClick={() => navigate("/")}>Home</span>
              <span>/</span>
              <span className="cursor-pointer hover:text-[#4CBBA1]" onClick={() => navigate("/companylist")}>Companies</span>
              <span>/</span>
              <span className="text-[#4CBBA1] font-medium">{companyName}</span>
              <span>/</span>
              <span className="text-gray-700">Manage Features</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/companylist")}
              className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition"
            >
              <FaArrowLeft className="text-xs" /> Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#4CBBA1] hover:bg-[#3aa08a] text-white px-5 py-2 rounded-md text-sm font-semibold transition disabled:opacity-60"
            >
              <FaSave className="text-xs" />
              {saving ? "Saving..." : "Save Allocation"}
            </button>
          </div>
        </div>

        {/* Company Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#ebfbf7] flex items-center justify-center text-[#4CBBA1] text-2xl">
              <FaBuilding />
            </div>
            <div>
              <h2 className="font-bold text-[#1C1D3E] text-lg">{companyName}</h2>
              <p className="text-sm text-gray-500">
                Toggle modules ON/OFF · expand to set View / Create / Edit / Delete / Print / Export / Manage
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#4CBBA1] text-white text-xs font-bold px-3 py-1 rounded-full">{onCount} ON</span>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{offCount} OFF</span>
          </div>
        </div>

        {/* Module & Sub-Feature Permissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-[#1C1D3E] text-base">Module & Sub-Feature Permissions</h3>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-medium transition"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-medium transition"
              >
                Collapse All
              </button>
              <button
                onClick={() => toggleAll(true)}
                className="text-xs border border-[#4CBBA1] text-[#4CBBA1] hover:bg-[#ebfbf7] px-3 py-1.5 rounded-md font-medium transition"
              >
                Enable All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-medium transition"
              >
                Disable All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading modules...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {modules.map((mod, index) => {
                const sfs = getSubFeaturesForModule(mod.module_key);
                const isExpanded = !!expanded[mod.module_key];

                return (
                  <div key={mod.module_key}>
                    {/* Module Row */}
                    <div className={`flex items-center justify-between px-5 py-4 transition ${!mod.is_enabled ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-4">
                        <Toggle enabled={!!mod.is_enabled} onChange={() => toggleModule(index)} />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${mod.is_enabled ? "bg-[#ebfbf7] text-[#4CBBA1]" : "bg-gray-100 text-gray-400"}`}>
                          {MODULE_ICONS[mod.module_key] || <MdDashboard />}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1C1D3E] text-sm">{mod.module_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sfs.length} sub-features</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpand(mod.module_key)}
                        className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md font-medium transition"
                      >
                        Permissions {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                      </button>
                    </div>

                    {/* Sub-Feature Permissions Table */}
                    {isExpanded && sfs.length > 0 && (
                      <div className="px-5 pb-4 overflow-x-auto">
                        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                              <th className="text-left py-2 px-3 font-semibold w-48">Sub-Feature</th>
                              {PERM_LABELS.map((label) => (
                                <th key={label} className="py-2 px-2 font-semibold text-center">{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {/* Select All row */}
                            <tr className="bg-gray-50 border-b-2 border-gray-300">
                              <td className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Select All</td>
                              {PERM_COLS.map((col) => {
                                const hasApplicable = sfs.some((sf) => !sf.applicable_perms || sf.applicable_perms.includes(col));
                                const allChecked = isColumnAllChecked(sfs, col);
                                return (
                                  <td key={col} className="py-2 px-2 text-center">
                                    {hasApplicable ? (
                                      <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={() => toggleColumnAll(mod.module_key, col, allChecked ? 0 : 1)}
                                        className="w-4 h-4 accent-[#1C1D3E] cursor-pointer"
                                      />
                                    ) : (
                                      <span className="inline-block w-4 h-4 rounded bg-gray-200" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                            {sfs.map((sf) => (
                              <tr key={sf.sub_feature_key} className="hover:bg-gray-50 transition">
                                <td className="py-2 px-3 font-medium text-[#1C1D3E]">{sf.sub_feature_name}</td>
                                {PERM_COLS.map((col) => {
                                  const applicable = !sf.applicable_perms || sf.applicable_perms.includes(col);
                                  return (
                                    <td key={col} className="py-2 px-2 text-center">
                                      {applicable ? (
                                        <input
                                          type="checkbox"
                                          checked={!!sf[col]}
                                          onChange={() => togglePermission(mod.module_key, sf.sub_feature_key, col)}
                                          className="w-4 h-4 accent-[#4CBBA1] cursor-pointer"
                                        />
                                      ) : (
                                        <span className="inline-block w-4 h-4 rounded bg-gray-200" title="Not applicable" />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleAllocation;
