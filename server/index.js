require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const dataRoutes = require("./router/categoryRoute");
const printerRoutes = require("./router/printerRoute");
const kitchenRoutes = require("./router/kitchenRoute");
const addOneRoutes = require("./router/addoneRoute");
const addFloorRoutes = require("./router/addFloorRoute");
const addtableRoutes = require("./router/addTableRoute");
const addUnitMasurmentRouts = require("./router/addUnitMasurmentRout");
const ingredientRouts = require("./router/ingredientRoute");
const addFoodRouts = require("./router/addFoodRoute");
const menuTypeRouts = require("./router/menuTypeRoute");
const addCustomer = require("./router/addCustomerRoute");
const customerTypeRouts = require("./router/custometTypeRoute");
const posRouts = require("./router/posRoute");
const paynmentRouts = require("./router/paynmentRoute");
const purchasemanageRouts = require("./router/purchasemanageRoute");
const reportRouts = require("./router/reportRoute");
const reservationRouts = require("./router/reservationRoute");
const recipeRouts = require("./router/racipeRouts");
const roleandpremission = require("./router/roleandpermission");
const wastetracking = require("./router/wastetrackingRoute");
const userRouts = require("./router/userRoute");
const hrmRouts = require("./router/hrmRouts");
const leaveRouts = require("./router/leaveRoute");
const expenseRouts = require("./router/expenseRoute");
const CommissionSettingsRouts = require("./router/comissionSettingRoute");
const webSettingRouts = require("./router/webSettingRoute");
const cashRegisterRouts = require("./router/cashRegisterRoute");
const holdorderRouts = require("./router/holdOrderRoute");
const webuserRouts = require("./router/webUserRoute");
const shippingRoute = require("./router/shippingTypeRoute");
const pointRoute = require("./router/loyaltyRoute");
const splitorderRoute = require("./router/splitOrderRouts");
const superadmincmsRoute = require("./router/superAdmincmsRoute");
const addpackagesRoute = require("./router/createPackagesRoute");
const addcompany = require("./router/addComponayRoute");
const superadminsettingRoute = require("./router/superAdminSettingRoute");
const printkotRoute = require("./router/printkotRoute");
//const testPrintRoute = require("./router/testPrintRoute");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.static("asset/category"));
app.use(express.static("asset/icon"));
app.use(express.static("asset/user"));
app.use(express.static("asset/home"));

// Routes
//app.use("/api", testPrintRoute);
app.use("/api", printkotRoute);
app.use("/api", dataRoutes);
app.use("/api", printerRoutes);
app.use("/api", kitchenRoutes);
app.use("/api", addOneRoutes);
app.use("/api", addFloorRoutes);
app.use("/api", addtableRoutes);
app.use("/api", addUnitMasurmentRouts);
app.use("/api", ingredientRouts);
app.use("/api", addFoodRouts);
app.use("/api", menuTypeRouts);
app.use("/api", addCustomer);
app.use("/api", customerTypeRouts);
app.use("/api", posRouts);
app.use("/api", paynmentRouts);
app.use("/api", purchasemanageRouts);
app.use("/api", reportRouts);
app.use("/api", reservationRouts);
app.use("/api", recipeRouts);
app.use("/api", roleandpremission);
app.use("/api", userRouts);
app.use("/api", wastetracking);
app.use("/api", hrmRouts);
app.use("/api", leaveRouts);
app.use("/api", expenseRouts);
app.use("/api", CommissionSettingsRouts);
app.use("/api", webSettingRouts);
app.use("/api", cashRegisterRouts);
app.use("/api", holdorderRouts);
app.use("/api", webuserRouts);
app.use("/api", shippingRoute);
app.use("/api", pointRoute);
app.use("/api", splitorderRoute);
app.use("/api", superadmincmsRoute);
app.use("/api", addpackagesRoute);
app.use("/api", addcompany);
app.use("/api", superadminsettingRoute);

app.use("/login", express.static(path.join(__dirname, "login")));
app.get("/login/*", (req, res) => {
  res.sendFile(path.join(__dirname, "login", "index.html"));
});

// Admin Panel (frontend)
app.use("/frontend", express.static(path.join(__dirname, "frontend")));
app.get("/frontend/*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Super Admin Panel
app.use("/superadmin", express.static(path.join(__dirname, "superadmin")));
app.get("/superadmin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "superadmin", "index.html"));
});

app.use(
  "/restro-frontend",
  express.static(path.join(__dirname, "restro-frontend")),
);
app.get("/restro-frontend/*", (req, res) => {
  res.sendFile(path.join(__dirname, "restro-frontend", "index.html"));
});

// Return 404 for missing image/asset files instead of redirecting to login
app.get(/\.(jpg|jpeg|png|gif|svg|webp|ico|bmp)$/i, (req, res) => {
  res.status(404).end();
});

// Catch-all: redirect unknown routes to login, but exclude known SPA paths to prevent redirect loops
app.get(/^\/(?!api|login|frontend|superadmin|restro-frontend).*/, (req, res) => {
  res.redirect("/login");
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 45000;

const server = http.createServer(app);

// 👇 socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 👇 make socket globally accessible
app.set("io", io);

// 👇 socket connection log
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// 👇 IMPORTANT: server.listen (not app.listen)
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});


// app.listen(PORT, () => {
//   console.log(`Server is listening on port ${PORT}...`);
// });
