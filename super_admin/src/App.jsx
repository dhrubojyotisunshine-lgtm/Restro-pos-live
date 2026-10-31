import React, { useEffect } from 'react'
import './App.css'
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {  Route, Routes } from 'react-router-dom'
import ProtectedSuperAdminRoute from './components/ProtectedSuperAdminRoute';
import HomeSetting from "./screen/HomeSetting"
import FeaturesSetting from "./screen/FeaturesSetting"
import Privacy_PolicySetting from "./screen/Privacy_PolicySetting"
import GenerealSetting from "./screen/GeneralSetting"
import HomeFeatures_Setting from './screen/HomeFeatures_Setting'
import Dashboard from './screen/Dashboard';
import FeaturesCategory from './screen/FeaturesCategory';
import CreatePackages from './screen/CreatePackages';
import AllPackages from './screen/AllPackages';
import AddCompany from './screen/AddCompany';
import CompanyList from './screen/CompanyList';
import CompanySubscriptionList from './screen/CompanySubscriptionList';
import BasicCompanySetting from './screen/BasicCompanySetting';
import Enquiry from './screen/Enquiry';
import ManagePackagePage from './screen/ManagePackagePage';
import ModuleAllocation from './screen/ModuleAllocation';

function App() {
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Enter") return;
      const active = document.activeElement;
      if (!active) return;
      if (active.tagName !== "INPUT") return;
      if (active.type === "checkbox" || active.type === "radio") return;
      const container = active.closest("form, .modal, [role='dialog'], .dialog, .popup");
      if (!container) return;
      const submitBtn = container.querySelector("button[type='submit']:not([disabled])");
      if (submitBtn) submitBtn.click();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedSuperAdminRoute>
              <Dashboard />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/home-setting"
          element={
            <ProtectedSuperAdminRoute>
              <HomeSetting />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/homefeatures-setting"
          element={
            <ProtectedSuperAdminRoute>
              <HomeFeatures_Setting />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/fetures-setting"
          element={
            <ProtectedSuperAdminRoute>
              <FeaturesSetting />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/privacy-policy-setting"
          element={
            <ProtectedSuperAdminRoute>
              <Privacy_PolicySetting />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/general-setting"
          element={
            <ProtectedSuperAdminRoute>
              <GenerealSetting />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/featurescategory"
          element={
            <ProtectedSuperAdminRoute>
              <FeaturesCategory />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/addpackages"
          element={
            <ProtectedSuperAdminRoute>
              <CreatePackages />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/allPackages"
          element={
            <ProtectedSuperAdminRoute>
              <AllPackages />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/addcompany"
          element={
            <ProtectedSuperAdminRoute>
              <AddCompany />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/companylist"
          element={
            <ProtectedSuperAdminRoute>
              <CompanyList />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/companysubscriptionlist"
          element={
            <ProtectedSuperAdminRoute>
              <CompanySubscriptionList />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/companysetting"
          element={
            <ProtectedSuperAdminRoute>
              <BasicCompanySetting />
            </ProtectedSuperAdminRoute>
          }
        />
         <Route
          path="/manage/:id"
          element={
            <ProtectedSuperAdminRoute>
              <ManagePackagePage />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/enquiry"
          element={
            <ProtectedSuperAdminRoute>
              <Enquiry />
            </ProtectedSuperAdminRoute>
          }
        />
        <Route
          path="/module-allocation/:adminId"
          element={
            <ProtectedSuperAdminRoute>
              <ModuleAllocation />
            </ProtectedSuperAdminRoute>
          }
        />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
   
   
  )
}

export default App
