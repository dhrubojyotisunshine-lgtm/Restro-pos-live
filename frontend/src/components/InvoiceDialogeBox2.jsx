import React, { useEffect, useState,useContext } from "react";
import axios from "axios";
import { AuthContext } from "../store/AuthContext";
export const InvoiceDialogBox2 = React.forwardRef((props, ref) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL=import.meta.env.VITE_IMG_URL
  const { userId, username } = useContext(AuthContext);
  const token = localStorage.getItem("token");
  const [data, setData] = useState(null);

  const fetchImageData = () => {
    axios
      .get(`${API_BASE_URL}/websetting`, { headers: { Authorization: token } })
      .then((response) => {
        setData(response.data.data);
      })
      .catch((error) => {
        console.error("Error fetching image data:", error);
      });
  };

  useEffect(() => {
    fetchImageData();
  }, []);

  const { billData } = props;

  if (!billData || billData.length === 0) {
    return <div>No data available</div>;
  }

  const orderDetails = billData[0]?.orderDetails?.[0] || {};
  const menuItems = billData[0]?.menuItems || [];

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };
  const logoUrls = data.map((val) => {
   
      return `${VITE_IMG_URL}${val.logo}`; // Correctly concatenate APP_URL with val.logo
 
  });
  const logoUrls2 = data.map((val) => {
   
    return `${VITE_IMG_URL}${val.logo_footer}`; // Correctly concatenate APP_URL with val.logo

});



  return (
    <div ref={ref}>
      <div className="max-w-lg mx-auto p-4 bg-white border rounded-lg shadow-md">
        {/* <header className="text-center">
         
            <img src={logoUrls} alt="Logo" className="mx-auto block" width={200} />
        
          <h1 className="text-xl font-bold">{data[0].restro_name}</h1>
          <p>
           {data[0].address}
          </p>
        </header> */}
        <div className="text-center mt-2">
          <p>
            <strong>Date:</strong> {new Date().toLocaleDateString()}
          </p>
        </div>
        <hr className="my-4" />

        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="border-b py-2">Item</th>
              <th className="border-b py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="py-2">{item.ProductName}</td>
                  <td className="py-2 text-right">
                    ${formatAmount(item.price * item.menuqty)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">
                    <span>{item.variantName}</span> <br />
                    {item.price} x {item.menuqty}
                  </td>
                  <td className="py-2 text-right"></td>
                </tr>
                {item.add_ons?.map((addon, aIndex) => (
                  <tr key={aIndex}>
                    <td className="py-2">
                      {addon.add_on_name}
                      <br />
                      <span>${formatAmount(addon.add_on_price)}</span> x{" "}
                      {addon.add_on_quantity}
                    </td>
                    <td className="py-2 text-right">
                      ${formatAmount(addon.add_on_price * addon.add_on_quantity)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-dashed border-1">
                  <td></td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="font-semibold">
              <td className="py-2 border-t">Subtotal</td>
              <td className="py-2 text-right border-t">
                ${formatAmount(orderDetails.totalamount)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-2">VAT</td>
              <td className="py-2 text-right">
                ${formatAmount(orderDetails.VAT)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-2 border-t">Service Charge</td>
              <td className="py-2 text-right border-t">
                ${formatAmount(orderDetails.service_charge)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-2 border-t">Total Payment</td>
              <td className="py-2 text-right border-t">
                ${formatAmount(orderDetails.bill_amount)}
              </td>
            </tr>
          </tbody>
        </table>

        <footer className="text-center mt-4">
          <p>Billing To: {orderDetails.customer_name || "Unknown"}</p>
          {/* <p>Bill By:{username} </p> */}
          <p>
            Table: {orderDetails.tablename || orderDetails.table_no || "N/A"} | Order No.:{" "}
            {orderDetails.saleinvoice || orderDetails.order_id || "N/A"}
          </p>
          <p className="mt-4 font-bold">Thank you very much</p>
        </footer>

        {/* <div className="text-center mt-4">
          <p className="text-sm">
            Powered By:{data[0].powerbytxt}
          </p>
          <img src={logoUrls2} alt="Logo" className="mx-auto block" width={200} />
        </div> */}
      </div>
    </div>
  );
});
