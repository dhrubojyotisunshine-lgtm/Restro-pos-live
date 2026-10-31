import React, { useEffect, useState, useContext } from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/AuthContext";
import ProtectedRoute from "./store/ProtectedRoute";
// Home Screen
import Home from "./screen/Home";

// Food Management
import AddCategory from "./screen/foodmanagement/AddCategory";
import AddFood from "./screen/foodmanagement/AddFood";

import AddOns from "./screen/foodmanagement/AddOns";
import CategoryList from "./screen/foodmanagement/CategoryList";

import FoodList from "./screen/foodmanagement/FoodList";

import MenuType from "./screen/foodmanagement/MenuType";

// Manage Order
import CancleOrder from "./screen/manageorder/CancleOrder";
import CompleteOrder from "./screen/manageorder/CompleteOrder";
import CounterList from "./screen/manageorder/CounterList";
import OrdersList from "./screen/manageorder/OrdersList";
import PendingOrder from "./screen/manageorder/PendingOrder";
import PosSetting from "./screen/manageorder/PosSetting";
import SoundSetting from "./screen/manageorder/SoundSetting";

// Manage Table
import AddFloor from "./screen/managetable/AddFloor";
import TableList from "./screen/managetable/TableList";
// import TableModal from "./screen/managetable/TableModal";
import AllTableQr from "./screen/managetable/AllTableQr";
import AddCustomer from "./screen/recipemanagement/AddCustomer";
import CustomerType from "./screen/recipemanagement/CustomerType";
// Master Setup - Kitchen Setting

import KitchenList from "./screen/mastersetup/KitchenList";

// POS Screen

import OnGoingOrder from "./screen/posscreen/OnGoingOrder";
import OnlineOrder from "./screen/posscreen/OnlineOrder";
import OrderList from "./screen/posscreen/OrderList";
import QrOrder from "./screen/posscreen/QrOrder";
import TodayOrder from "./screen/posscreen/TodayOrder";

// Printers
import AddPrinters from "./screen/printers/AddPrinters";
import PrinterList from "./screen/printers/PrinterList";
// User & staff
import Add_user from "./screen/user_and_staf/Add_user";
import User_list from "./screen/user_and_staf/User_list";
// Purchase Management
import AddPurchase from "./screen/purchasemanage/AddPurchase";
import PurchaseItem from "./screen/purchasemanage/PurchaseItem";
import PurchaseReturn from "./screen/purchasemanage/PurchaseReturn";
import ReturnInvoice from "./screen/purchasemanage/ReturnInvoice";
import StockOutIngredients from "./screen/purchasemanage/StockOutIngredients";
import SupplierLadger from "./screen/purchasemanage/SupplierLadger";
import SupplierManage from "./screen/purchasemanage/SupplierManage";

// Recipe Management
import AddProduction from "./screen/recipemanagement/AddProduction";
import IngredientList from "./screen/recipemanagement/IngredientList";
import SetProductionUnit from "./screen/recipemanagement/SetProductinUnit";
import SetProductionList from "./screen/recipemanagement/SetProductionList";
import UnitMasurment from "./screen/recipemanagement/UnitMasurment";

// Reports
import CashRegisterReport from "./screen/report/CashRegisterReport";
import Commission from "./screen/report/Commission";
import PurchaseReport from "./screen/report/PurchaseReport";
import SaleByDay from "./screen/report/SaleByDay";
import SaleReport from "./screen/report/SaleReport";
import SaleReportFilter from "./screen/report/SaleReportFilter";
import StockReportFoodItem from "./screen/report/StockReportFoodItem";
import StockReportKitchen from "./screen/report/StockReportKitchen";
import SaleByTable from "./screen/report/SaleByTable";
import WaiterSaleReport from "./screen/report/WaiterSaleReport";

// role and permission

import Role_list from "./screen/roleandpermission/Role_list";
import Add_role from "./screen/roleandpermission/Add_role";
// import Premission_setup from "./screen/roleandpermission/Premission_setup";
import User_Access_role from "./screen/roleandpermission/User_Access_role";
// Reservation
import AddBooking from "./screen/reservation/AddBooking";
import Reservation from "./screen/reservation/Reservation";
import ReservationSetting from "./screen/reservation/ReservationSetting";
import UnavilablityDays from "./screen/reservation/UnavilablityDays";
// Waste Tracking
import PackagingFood from "./screen/wastetracking/PackagingFood";
// Error
import Error from "./screen/Error";
// Log-In
// import Log_in from "./screen/Log_in";
import ServiceChargeReport from "./screen/report/ServiceChargeReport";
import SaleReportCashier from "./screen/report/SaleReportCashier";
import ItemSaleReport from "./screen/report/ItemSaleReport";
import PurchaseFoodwaste from "./screen/wastetracking/PurchaseFoodwaste";
import MakingFoodwaste from "./screen/wastetracking/MakingFoodwaste";
import Designation from "./screen/humanresource/Designation";
import ManageEmploye from "./screen/humanresource/ManageEmploye";
import AddEmpolye from "./screen/humanresource/AddEmpolye";
import EditRole_Page from "./screen/roleandpermission/EditRole_Page";
import Department from "./screen/humanresource/Department";
import Division from "./screen/humanresource/Division";
import Holiday from "./screen/humanresource/Holiday";
import Leave_type from "./screen/humanresource/Leave_type";
import Leave_application from "./screen/humanresource/Leave_application";
import Addexpense_item from "./screen/humanresource/Addexpense_item";
import Add_expense from "./screen/humanresource/Add_expense";
import ComissionSetup from "./screen/mastersetup/ComissionSetup";
import EditOrder from "./screen/posscreen/EditOrder";
import Common_Setting from "./screen/websetting/Common_Setting";
import Case_Register from "./screen/posscreen/Cash_Register";
import Cash_Register from "./screen/posscreen/Cash_Register";
import DeleverySaleReport from "./screen/report/DeleverySaleReport";
import QrOrder_Page from "./screen/qrorders/QrOrder_Page";
import Checkout_Order from "./screen/qrorders/Checkout_Order";
import EditQrOrder from "./screen/qrorders/EditQrOrder";
import ShippingType from "./screen/mastersetup/ShippingType";
import ForgetPassword from "./screen/ForgetPassword";
import Edit_qrPage from "./screen/qrorders/Edit_qrPage";
import Point_setting from "./screen/loyalty/Point_setting";
import Customer_point from "./screen/loyalty/Customer_point";
import ResetPassword from "./screen/ResetPassword";
import InventoryStock from "./screen/purchasemanage/InventoryStock";
import MySubscription from "./screen/websetting/MySubscription";
import Commission_Position from "./screen/mastersetup/Commission_Position";
import KitchenStatus from "./screen/posscreen/KItchenStatus";
import KitchenDashboard from "./screen/manageorder/KitchenDashboard";

const App = () => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Enter") return;
      const active = document.activeElement;
      if (!active) return;
      const tag = active.tagName;
      if (tag !== "INPUT") return; // only trigger from input fields
      if (active.type === "checkbox" || active.type === "radio") return;
      // must be inside a form or modal container
      const container = active.closest("form, .modal, [role='dialog'], .dialog, .popup");
      if (!container) return;
      const submitBtn =
        container.querySelector("button[type='submit']:not([disabled])") ||
        container.querySelector("button.bg-\\[\\#4CBBA1\\]:not([disabled]):not([type='reset'])");
      if (submitBtn) {
        e.preventDefault();
        submitBtn.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(() => {
    const savedTimestamp = localStorage.getItem("isCashRegisterOpen");
    if (!savedTimestamp) return false;
    const elapsed = Date.now() - parseInt(savedTimestamp);
    const withinLimit = elapsed < 24 * 60 * 60 * 1000; // 24 hours
    if (!withinLimit) localStorage.removeItem("isCashRegisterOpen");
    return withinLimit;
  });
  return (
    <AuthProvider>
      <BrowserRouter basename="/frontend">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route path="/edit-role/:id" element={<ProtectedRoute><EditRole_Page /></ProtectedRoute>} />
          <Route
            path="/edit-order/:id"
            element={
              <ProtectedRoute>
                <EditOrder />
              </ProtectedRoute>
            }
          />
          {/* Food Management */}
          <Route
            path="/add-category"
            element={
              <ProtectedRoute>
                <AddCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-food"
            element={
              <ProtectedRoute>
                <AddFood />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-ons"
            element={
              <ProtectedRoute>
                <AddOns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-list"
            element={
              <ProtectedRoute>
                <CategoryList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/food-list"
            element={
              <ProtectedRoute>
                <FoodList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/menu-type"
            element={
              <ProtectedRoute>
                <MenuType />
              </ProtectedRoute>
            }
          />

          {/* User & staff */}

          <Route
            path="/add-user"
            element={
              <ProtectedRoute>
                <Add_user />
              </ProtectedRoute>
            }
          ></Route>

          <Route
            path="/user-list"
            element={
              <ProtectedRoute>
                <User_list />
              </ProtectedRoute>
            }
          ></Route>

          {/* Manage Order */}
          <Route
            path="/cancel-order"
            element={
              <ProtectedRoute>
                <CancleOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen-dashboard"
            element={
              <ProtectedRoute>
                <KitchenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complete-order"
            element={
              <ProtectedRoute>
                <CompleteOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/counter-list"
            element={
              <ProtectedRoute>
                <CounterList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders-list"
            element={
              <ProtectedRoute>
                <OrdersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending-order"
            element={
              <ProtectedRoute>
                <PendingOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos-setting"
            element={
              <ProtectedRoute>
                <PosSetting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sound-setting"
            element={
              <ProtectedRoute>
                <SoundSetting />
              </ProtectedRoute>
            }
          />

          {/* Manage Table */}
          <Route
            path="/add-floor"
            element={
              <ProtectedRoute>
                <AddFloor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/table-list"
            element={
              <ProtectedRoute>
                <TableList />
              </ProtectedRoute>
            }
          />

          {/* Master Setup - Kitchen Setting */}

          <Route
            path="/shipping-type"
            element={
              <ProtectedRoute>
                <ShippingType />
              </ProtectedRoute>
            }
          />

          <Route
            path="/kitchen-list"
            element={
              <ProtectedRoute>
                <KitchenList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alltable-Qr"
            element={
              <ProtectedRoute>
                <AllTableQr />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer-type"
            element={
              <ProtectedRoute>
                <CustomerType />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-customer"
            element={
              <ProtectedRoute>
                <AddCustomer />
              </ProtectedRoute>
            }
          />

          <Route
            path="/commission-setting"
            element={
              <ProtectedRoute>
                <ComissionSetup />
              </ProtectedRoute>
            }
          />

          {/* POS Screen */}

          <Route
            path="/ongoing-order"
            element={
              <ProtectedRoute>
                <OnGoingOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/online-order"
            element={
              <ProtectedRoute>
                <OnlineOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen-status"
            element={
              <ProtectedRoute>
                <KitchenStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-list"
            element={
              isCashRegisterOpen ? (
                <ProtectedRoute>
                  <OrderList setIsCashRegisterOpen={setIsCashRegisterOpen} />
                </ProtectedRoute>
              ) : (
                <Navigate to="/case-register" />
              )
            }
          />

          <Route
            path="/qr-order"
            element={
              <ProtectedRoute>
                <QrOrder />
              </ProtectedRoute>
            }
          />
          <Route path="/qr-orders/:tableId" element={<QrOrder_Page />} />

          {/* <Route
            path="/qr-orders"
            element={
             
                <QrOrder_Page />
             
            }
          /> */}
          <Route path="/checkout-order/:tableId" element={<Checkout_Order />} />

          <Route path="/editqrorder/:tableId" element={<EditQrOrder />} />
          <Route path="/editQrorderdata/:tableId" element={<Edit_qrPage />} />
          <Route
            path="/today-order"
            element={
              <ProtectedRoute>
                <TodayOrder />
              </ProtectedRoute>
            }
          />

          {/* Printers */}
          <Route
            path="/add-printers"
            element={
              <ProtectedRoute>
                <AddPrinters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/printer-list"
            element={
              <ProtectedRoute>
                <PrinterList />
              </ProtectedRoute>
            }
          />

          {/* Purchase Management */}
          <Route
            path="/add-purchase"
            element={
              <ProtectedRoute>
                <AddPurchase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-item"
            element={
              <ProtectedRoute>
                <PurchaseItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-return"
            element={
              <ProtectedRoute>
                <PurchaseReturn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/return-invoice"
            element={
              <ProtectedRoute>
                <ReturnInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-out-ingredients"
            element={
              <ProtectedRoute>
                <StockOutIngredients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-list"
            element={
              <ProtectedRoute>
                <InventoryStock />
              </ProtectedRoute>
            }
          />

          <Route
            path="/supplier-ladger"
            element={
              <ProtectedRoute>
                <SupplierLadger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier-manage"
            element={
              <ProtectedRoute>
                <SupplierManage />
              </ProtectedRoute>
            }
          />

          {/* Recipe Management */}
          <Route
            path="/add-production"
            element={
              <ProtectedRoute>
                <AddProduction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ingredient-list"
            element={
              <ProtectedRoute>
                <IngredientList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/set-production-unit"
            element={
              <ProtectedRoute>
                <SetProductionUnit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/set-production-list"
            element={
              <ProtectedRoute>
                <SetProductionList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unit-measurement"
            element={
              <ProtectedRoute>
                <UnitMasurment />
              </ProtectedRoute>
            }
          />

          {/* roles and perimission */}

          <Route
            path="/rolelist"
            element={
              <ProtectedRoute>
                <Role_list />
              </ProtectedRoute>
            }
          />

          <Route
            path="/commission-position"
            element={
              <ProtectedRoute>
                <Commission_Position />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user-access-role"
            element={
              <ProtectedRoute>
                <User_Access_role />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-role"
            element={
              <ProtectedRoute>
                <Add_role />
              </ProtectedRoute>
            }
          />

          {/* 

{/*Loyalty*/}

          <Route
            path="/point-setting"
            element={
              <ProtectedRoute>
                <Point_setting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer-point"
            element={
              <ProtectedRoute>
                <Customer_point />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/case-register-report"
            element={
              <ProtectedRoute>
                <CashRegisterReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliverytype-report"
            element={
              <ProtectedRoute>
                <DeleverySaleReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/commission"
            element={
              <ProtectedRoute>
                <Commission />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-report"
            element={
              <ProtectedRoute>
                <PurchaseReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/waitersale-report"
            element={
              <ProtectedRoute>
                <WaiterSaleReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/servicecharge-report"
            element={
              <ProtectedRoute>
                <ServiceChargeReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/itemsale-report"
            element={
              <ProtectedRoute>
                <ItemSaleReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashier-report"
            element={
              <ProtectedRoute>
                <SaleReportCashier />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saleby-day"
            element={
              <ProtectedRoute>
                <SaleByDay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sale-report"
            element={
              <ProtectedRoute>
                <SaleReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sale-report-filter"
            element={
              <ProtectedRoute>
                <SaleReportFilter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/foodstock-report"
            element={
              <ProtectedRoute>
                <StockReportFoodItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchenstock-report"
            element={
              <ProtectedRoute>
                <StockReportKitchen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/saleby-table"
            element={
              <ProtectedRoute>
                <SaleByTable />
              </ProtectedRoute>
            }
          />

          {/* Reservation */}
          <Route
            path="/add-booking"
            element={
              <ProtectedRoute>
                <AddBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservation"
            element={
              <ProtectedRoute>
                <Reservation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservation-setting"
            element={
              <ProtectedRoute>
                <ReservationSetting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unavailability-days"
            element={
              <ProtectedRoute>
                <UnavilablityDays />
              </ProtectedRoute>
            }
          />
          {/* Waste Tracking */}
          <Route
            path="/packaging-food"
            element={
              <ProtectedRoute>
                <PackagingFood />
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchasefood-waste"
            element={
              <ProtectedRoute>
                <PurchaseFoodwaste />
              </ProtectedRoute>
            }
          />

          <Route
            path="/makingfood-waste"
            element={
              <ProtectedRoute>
                <MakingFoodwaste />
              </ProtectedRoute>
            }
          />

          {/* Human Resourse */}

          <Route
            path="/designation"
            element={
              <ProtectedRoute>
                <Designation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manageemployee"
            element={
              <ProtectedRoute>
                <ManageEmploye />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-employee"
            element={
              <ProtectedRoute>
                <AddEmpolye />
              </ProtectedRoute>
            }
          />

          <Route
            path="/department"
            element={
              <ProtectedRoute>
                <Department />
              </ProtectedRoute>
            }
          />

          <Route
            path="/division"
            element={
              <ProtectedRoute>
                <Division />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holiday"
            element={
              <ProtectedRoute>
                <Holiday />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leavetype"
            element={
              <ProtectedRoute>
                <Leave_type />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaveapplication"
            element={
              <ProtectedRoute>
                <Leave_application />
              </ProtectedRoute>
            }
          />
          <Route
            path="/addexpenseitem"
            element={
              <ProtectedRoute>
                <Addexpense_item />
              </ProtectedRoute>
            }
          />
          <Route
            path="/addexpense"
            element={
              <ProtectedRoute>
                <Add_expense />
              </ProtectedRoute>
            }
          />

          {/* Web setting */}

          <Route
            path="/common-setting"
            element={
              <ProtectedRoute>
                <Common_Setting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-subscription"
            element={
              <ProtectedRoute>
                <MySubscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sound-setting"
            element={
              <ProtectedRoute>
                <SoundSetting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/case-register"
            element={
              <ProtectedRoute>
                <Cash_Register setIsCashRegisterOpen={setIsCashRegisterOpen} />
              </ProtectedRoute>
            }
          />

          {/* Log_in */}
          <Route
            path="/login"
            element={
              <Navigate to="https://krayon.softwarestesting.co.in/login/" replace />
            }
          />
          {/* <Route path="/log-in" element={<Log_in />} /> */}
          <Route path="/forgetpassword" element={<ForgetPassword />} />
          <Route path="/resetpassword/:id/:token" element={<ResetPassword />} />
          {/* Error */}
          <Route path="/working" element={<Error />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
