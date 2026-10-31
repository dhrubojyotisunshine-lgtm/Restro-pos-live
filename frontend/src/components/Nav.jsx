import React, { useEffect, useState, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { VscArrowLeft } from "react-icons/vsc";
import { IoHome, IoSettingsOutline, IoSettings } from "react-icons/io5";
import { SiFoodpanda } from "react-icons/si";
import { SlPeople } from "react-icons/sl";
import { SiUikit } from "react-icons/si";
import { GoGraph } from "react-icons/go";
import { GiCook } from "react-icons/gi";
import { FaRegTrashCan } from "react-icons/fa6";
import { RiDashboard3Fill } from "react-icons/ri";
import { FaBriefcase, FaCartShopping, FaCaretDown } from "react-icons/fa6";
import { IoIosPeople } from "react-icons/io";
import { FaFirstOrder, FaLock, FaTags } from "react-icons/fa";
import { AuthContext } from "../store/AuthContext";
import { FaTrophy } from "react-icons/fa";
import { MdInventory } from "react-icons/md";
import fallback from "../assets/images/Group 206124.png";
import axios from "axios";
const Nav = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { permissions, isAdmin } = useContext(AuthContext);
  const [open, setOpen] = useState(true);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState(null);
  const location = useLocation();
  const [data, setData] = useState(null);
  const [data2, setData2] = useState(null);
  const { isLogin, logoutUser } = useContext(AuthContext);
  const token = localStorage.getItem("token");
  const [enabledModuleKeys, setEnabledModuleKeys] = useState(null);
  const [subFeaturePerms, setSubFeaturePerms] = useState(null);

  useEffect(() => {
    if (token) {
      axios
        .get(`${API_BASE_URL}/module-allocation/my-modules`, {
          headers: { Authorization: token },
        })
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setEnabledModuleKeys(new Set(res.data.data));
          }
        })
        .catch(() => setEnabledModuleKeys(null));

      axios
        .get(`${API_BASE_URL}/module-allocation/my-sub-features`, {
          headers: { Authorization: token },
        })
        .then((res) => {
          if (res.data?.success) {
            setSubFeaturePerms(res.data.data);
          }
        })
        .catch(() => setSubFeaturePerms(null));
    }
  }, [token]);

  useEffect(() => {
    Menus.forEach((menu, index) => {
      if (menu.submanu) {
        menu.submanuItems.forEach((subItem) => {
          if (location.pathname === subItem.link) {
            setOpenSubmenuIndex(index);
          }
        });
      }
    });
  }, [location.pathname]);

  const hasAnyPermission = (moduleName) => {
    if (isAdmin) {
      return true;
    }

    const modulePermissions = permissions.find(
      (perm) => perm.module_name === moduleName
    );
    return (
      modulePermissions &&
      (modulePermissions.can_access === 1 ||
        modulePermissions.can_create === 1 ||
        modulePermissions.can_edit === 1 ||
        modulePermissions.can_delete === 1)
    );
  };
  const toggleSubmenu = (index) => {
    setOpenSubmenuIndex(openSubmenuIndex === index ? null : index);
  };
  const Menus = [
    {
      title: "Dashboard",
      link: "/",
      icon: <RiDashboard3Fill />,
    },
    {
      title: "Manage Order",
      module_key: "manage_order",
      submanu: true,
      icon: <FaFirstOrder />,
      submanuItems: [
        { title: "POS Invoice",        link: "/order-list",         sub_feature_key: "pos_invoice" },
        { title: "Order List",         link: "/orders-list",        sub_feature_key: "order_list" },
        { title: "Pending Order",      link: "/pending-order",      sub_feature_key: "pending_order" },
        { title: "Complete Order",     link: "/complete-order",     sub_feature_key: "complete_order" },
        { title: "Cancel Order",       link: "/cancel-order",       sub_feature_key: "cancel_order" },
        { title: "Kitchen Dashboard",  link: "/kitchen-dashboard",  sub_feature_key: "kitchen_dashboard" },
      ],
    },
    {
      title: "Reservation",
      module_key: "reservation",
      submanu: true,
      icon: <FaTags />,
      submanuItems: [
        { title: "All Reservations",  link: "/reservation",         sub_feature_key: "all_reservations" },
        { title: "Add Booking",       link: "/add-booking",         sub_feature_key: "add_booking" },
        { title: "Unavailable today", link: "/unavailability-days", sub_feature_key: "unavailable_today" },
      ],
    },
    {
      title: "Purchase Manage",
      module_key: "purchase_manage",
      icon: <FaCartShopping />,
      submanu: true,
      submanuItems: [
        { title: "Purchase Item",    link: "/purchase-item",    sub_feature_key: "purchase_item" },
        { title: "Add Purchase",     link: "/add-purchase",     sub_feature_key: "add_purchase" },
        { title: "Purchase Return",  link: "/purchase-return",  sub_feature_key: "purchase_return" },
        { title: "Return Invoice",   link: "/return-invoice",   sub_feature_key: "return_invoice" },
        { title: "Supplier Manage",  link: "/supplier-manage",  sub_feature_key: "supplier_manage" },
        { title: "Supplier Ledger",  link: "/supplier-ladger",  sub_feature_key: "supplier_ledger" },
      ],
    },
    {
      title: "Food Management",
      module_key: "food_management",
      icon: <IoHome />,
      submanu: true,
      submanuItems: [
        { title: "Add Category",  link: "/add-category",  sub_feature_key: "add_category" },
        { title: "Category List", link: "/category-list", sub_feature_key: "category_list" },
        { title: "Add Food",      link: "/add-food",      sub_feature_key: "add_food" },
        { title: "Food List",     link: "/food-list",     sub_feature_key: "food_list" },
        { title: "Menu Type",     link: "/menu-type",     sub_feature_key: "menu_type" },
        { title: "Add Ons",       link: "/add-ons",       sub_feature_key: "add_ons" },
      ],
    },
    {
      title: "Recipe Management",
      module_key: "recipe_management",
      icon: <GiCook />,
      submanu: true,
      submanuItems: [
        { title: "Set Production Unit", link: "/set-production-unit", sub_feature_key: "set_production_unit" },
        { title: "Production Set List", link: "/set-production-list", sub_feature_key: "production_set_list" },
        { title: "Add Production",      link: "/add-production",      sub_feature_key: "add_production" },
      ],
    },

    {
      title: "Inventory Management",
      module_key: "inventory_management",
      icon: <MdInventory />,
      submanu: true,
      submanuItems: [
        { title: "Ingredient stock list",  link: "/stock-list",             sub_feature_key: "ingredient_stock_list" },
        { title: "Stock out ingredients",  link: "/stock-out-ingredients",  sub_feature_key: "stock_out_ingredients" },
      ],
    },

    {
      title: "Loyalty",
      module_key: "loyalty",
      icon: <FaTrophy />,
      submanu: true,
      submanuItems: [
        { title: "Point Setting",       link: "/point-setting",  sub_feature_key: "point_setting" },
        { title: "Customer Point List", link: "/customer-point", sub_feature_key: "customer_point_list" },
      ],
    },
    {
      title: "Roles & Permission",
      module_key: "roles_permission",
      icon: <FaLock />,
      submanu: true,
      submanuItems: [
        { title: "Add Role",         link: "/add-role",          sub_feature_key: "add_role" },
        { title: "Role List",        link: "/rolelist",          sub_feature_key: "role_list" },
        { title: "User Access Role", link: "/user-access-role",  sub_feature_key: "user_access_role" },
      ],
    },
    {
      title: "User & Staff",
      module_key: "user_staff",
      icon: <SlPeople />,
      submanu: true,
      submanuItems: [
        { title: "Add User",   link: "/add-user",   sub_feature_key: "add_user" },
        { title: "User List",  link: "/user-list",  sub_feature_key: "user_list" },
      ],
    },
    {
      title: "Report",
      module_key: "report",
      icon: <GoGraph />,
      submanu: true,
      submanuItems: [
        { title: "Purchase Report",            link: "/purchase-report",      sub_feature_key: "purchase_report" },
        { title: "Stock Report (Food Items)",  link: "/foodstock-report",     sub_feature_key: "foodstock_report" },
        { title: "Stock Report (Kitchen)",     link: "/kitchenstock-report",  sub_feature_key: "kitchenstock_report" },
        { title: "Delivery Type Sales Report", link: "/deliverytype-report",  sub_feature_key: "deliverytype_report" },
        { title: "Sale Report",                link: "/sale-report",          sub_feature_key: "sale_report" },
        { title: "Waiter Sale Report",         link: "/waitersale-report",    sub_feature_key: "waitersale_report" },
        { title: "Service Charge Report",      link: "/servicecharge-report", sub_feature_key: "servicecharge_report" },
        { title: "Sale Report cashier",        link: "/cashier-report",       sub_feature_key: "cashier_report" },
        { title: "Item Sales Report",          link: "/itemsale-report",      sub_feature_key: "itemsale_report" },
        { title: "Cash Register Report",       link: "/case-register-report", sub_feature_key: "cash_register_report" },
        { title: "Sale Report Filtering",      link: "/sale-report-filter",   sub_feature_key: "sale_report_filter" },
        { title: "Sale By Date",               link: "/saleby-day",           sub_feature_key: "saleby_day" },
        { title: "Sale By Table",              link: "/saleby-table",         sub_feature_key: "saleby_table" },
        { title: "Commission Report",          link: "/commission",           sub_feature_key: "commission_report" },
      ],
    },
    {
      title: "Master Set UP",
      module_key: "master_setup",
      icon: <SiUikit />,
      submanu: true,
      submanuItems: [
        { title: "Unit Measurement",        link: "/unit-measurement",    sub_feature_key: "unit_measurement" },
        { title: "Ingredients",             link: "/ingredient-list",     sub_feature_key: "ingredients" },
        { title: "Kitchen List",            link: "/kitchen-list",        sub_feature_key: "kitchen_list" },
        { title: "Printers",                link: "/printer-list",        sub_feature_key: "printers" },
        { title: "Table & Floor Manage",    link: "/table-list",          sub_feature_key: "table_floor_manage" },
        { title: "All Table-QR",            link: "/alltable-Qr",         sub_feature_key: "all_table_qr" },
        { title: "Add Customers",           link: "/add-customer",        sub_feature_key: "add_customers" },
        { title: "Order Type",              link: "/customer-type",       sub_feature_key: "order_type" },
        { title: "Shipping Type",           link: "/shipping-type",       sub_feature_key: "shipping_type" },
        { title: "Add Commission Position", link: "/commission-position", sub_feature_key: "commission_position" },
        { title: "Commission Setting",      link: "/commission-setting",  sub_feature_key: "commission_setting" },
      ],
    },
    {
      title: "Human Resource",
      module_key: "human_resource",
      icon: <IoIosPeople />,
      submanu: true,
      submanuItems: [
        { title: "Designation",       link: "/designation",      sub_feature_key: "designation" },
        { title: "Add Employee",      link: "/add-employee",     sub_feature_key: "add_employee" },
        { title: "Manage Employee",   link: "/manageemployee",   sub_feature_key: "manage_employee" },
        { title: "Add Expense Item",  link: "/addexpenseitem",   sub_feature_key: "add_expense_item" },
        { title: "Add Expense",       link: "/addexpense",       sub_feature_key: "add_expense" },
        { title: "Department",        link: "/department",       sub_feature_key: "department" },
        { title: "Division",          link: "/division",         sub_feature_key: "division" },
        { title: "Holiday",           link: "/holiday",          sub_feature_key: "holiday" },
        { title: "Leave Type",        link: "/leavetype",        sub_feature_key: "leave_type" },
        { title: "Leave Application", link: "/leaveapplication", sub_feature_key: "leave_application" },
      ],
    },

    // {
    //   title: "Setting",
    //   icon: <IoSettings />,
    //   submanu: true,
    //   submanuItems: [
    //     { title: "Payment Method Setting", link: "/working" },
    //     { title: "SMS Setting", link: "/working" },
    //     { title: "Bank", link: "/working" },
    //     { title: "Language", link: "/working" },
    //     { title: "Sound Setting", link: "/working" },
    //   ],
    // },
    {
      title: "Waste Tracking",
      module_key: "waste_tracking",
      icon: <FaRegTrashCan />,
      submanu: true,
      submanuItems: [
        { title: "Packaging Food",      link: "/packaging-food",      sub_feature_key: "packaging_food" },
        { title: "Purchase Food Waste", link: "/purchasefood-waste",  sub_feature_key: "purchasefood_waste" },
        { title: "Making Food Waste",   link: "/makingfood-waste",    sub_feature_key: "makingfood_waste" },
      ],
    },
    {
      title: "Setting",
      icon: <IoSettingsOutline />,
      submanu: true,
      submanuItems: [
        { title: "General Setting", link: "/common-setting",  sub_feature_key: "general_setting" },
        { title: "My Subscription", link: "/my-subscription", sub_feature_key: "my_subscription" },
        // { title: "Banner Setting", link: "/working" },
        // { title: "Menu Setting", link: "/working" },
        // { title: "SEO Setting", link: "/working" },
        // { title: "Widget Setting", link: "/working" },
        // { title: "Email Setting", link: "/working" },
        // { title: "Customer Setting", link: "/working" },
        // { title: "Coupon List", link: "/working" },
        // { title: "Subscribe List", link: "/working" },
        // { title: "Tyro", link: "/working" },
      ],
    },
  ];

  const fetchImageData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/websetting`, { headers: { Authorization: token } });
      console.log("API Response:", response);

      if (response?.data?.data && Array.isArray(response.data.data)) {
        if (response.data.data.length > 0) {
          setData(response.data.data[0]);
          // console.log("Set data to:", response.data.data[0]);
        } else {
          // console.warn("Data array is empty");
          setData(null);
        }
      } else {
        // console.warn("Data is not in the expected format:", response.data);
        setData(null);
      }
    } catch (error) {
      console.error("Error fetching image data:", error);
    }
  };
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const logoUrls = data2?.map((val) => `${VITE_IMG_URL}${val.fevicon}`) || [];

  const fetchImageData2 = () => {
    axios
      .get(`${API_BASE_URL}/websetting`, { headers: { Authorization: token } })
      .then((response) => {
        setData2(response.data.data);
        console.log("data shiw to imag", data);
      })
      .catch((error) => {
        console.error("Error fetching image data:", error);
      });
  };
  useEffect(() => {
    fetchImageData();
    fetchImageData2();
  }, []);

  return (
    <div
      className={`bg-[#1C1D3E] text-zinc-100  min-h-screen p-5 pt-8 ${
        open ? "w-auto" : "w-20"
      } relative duration-500`}
    >
      <VscArrowLeft
        className={`bg-black  text-3xl rounded-full absolute -right-3 top-9 border border-black cursor-pointer ${
          !open && "rotate-180"
        }`}
        onClick={() => setOpen(!open)}
      />
      <div className="flex items-center gap-3 mt-5 py-3">
        {/* <span  onClick={() => setOpen(!open)}>
              <img src={logoUrls}  alt="Logo" className="float-start cursor-pointer mr-2" width={70} />
            </span> */}
        <span onClick={() => setOpen(!open)}>
          <img
            src={fallback}
            alt="Logo"
            className="float-start cursor-pointer mr-2"
            width={70}
          />
        </span>
        <h1
          className={`text-2xl cursor-pointer font-bold origin-left ${
            !open && "hidden"
          }`}
        >
          {data?.restro_name ? data?.restro_name : "Restro POS"}
        </h1>
      </div>
      <div>
        {Menus.map((items, index) => {
          // Hide module if super admin has disabled it (null enabledModuleKeys = show all)
          if (items.module_key && enabledModuleKeys && !enabledModuleKeys.has(items.module_key)) {
            return null;
          }

          // Filter submenu items based on permissions
          const filteredSubmenuItems = items.submanuItems
            ? items.submanuItems.filter((subItem) => {
                if (!hasAnyPermission(subItem.title)) return false;
                // Hide if super admin explicitly set can_view = 0 for this sub-feature
                if (
                  subItem.sub_feature_key &&
                  subFeaturePerms &&
                  subFeaturePerms[subItem.sub_feature_key] &&
                  subFeaturePerms[subItem.sub_feature_key].can_view === 0
                ) {
                  return false;
                }
                return true;
              })
            : [];

          // Skip rendering if it's a submenu and has no accessible items
          if (items.submanu && filteredSubmenuItems.length === 0) return null;

          return (
            <div key={index}>
              <ul>
                <li
                  className={`text-lg flex  items-center gap-x-2 cursor-pointer p-2 hover:bg-[#4cddA1] hover:scale-105 duration-150 rounded-md mt-2${
                    location.pathname === items.link
                      ? "bg-[#4cddA1] text-zinc-900"
                      : ""
                  }`}
                  onClick={() => items.submanu && toggleSubmenu(index)}
                >
                  <span className="text-2xl">{items.icon}</span>
                  <span className={`flex-1 ${!open && "hidden"}`}>
                    <NavLink
                      to={items.link}
                      className={({ isActive }) =>
                        isActive ? "text-[#ffffff]" : "text-zinc-100 "
                      }
                    >
                      {items.title}
                    </NavLink>
                  </span>
                  {items.submanu && open && (
                    <FaCaretDown
                      className={`${
                        openSubmenuIndex === index ? "rotate-180" : ""
                      } duration-500`}
                    />
                  )}
                </li>

                {/* Render sub-menu items only if they exist and are accessible */}
                {items.submanu && openSubmenuIndex === index && open && (
                  <ul className="ml-8 rounded-sm">
                    {filteredSubmenuItems.map((subItem, subIndex) => (
                      <li
                        key={subIndex}
                        className={`duration-500 text-sm flex items-center gap-x-2 cursor-pointer p-2 rounded-md mt-2 ${
                          location.pathname === subItem.link
                            ? "bg-[#464747] text-zinc-900"
                            : ""
                        }`}
                      >
                        <NavLink
                          to={subItem.link}
                          // target={
                          //   subItem.link === "/order-list" ? "_blank" : "_self"
                          // }
                          className={({ isActive }) =>
                            isActive ? "text-[#4cddA1]" : "text-zinc-100"
                          }
                        >
                          {subItem.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </ul>
            </div>
          );
        })}

        {isLogin ? (
          <li
            className="text-lg flex items-center gap-x-2 rounded-md cursor-pointer p-2 hover:bg-[#4cddA1] hover:scale-105 duration-150"
            onClick={logoutUser}
          >
            Log-out
          </li>
        ) : (
          <li className="text-lg flex items-center gap-x-2 cursor-pointer p-2 hover:bg-[#4cddA1] hover:scale-105 duration-150">
            <NavLink to="/log-in" className="nav-link">
              Log-In
            </NavLink>
          </li>
        )}
      </div>
    </div>
  );
};

export default Nav;
