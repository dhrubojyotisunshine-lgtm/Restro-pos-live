import React from 'react'
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from '../components/Navbar';
const ManagePackagePage = () => {
 const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
    const { id } = useParams();
  const token = localStorage.getItem("token");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
useEffect(() => {
    axios
      .get(`${API_BASE_URL}/getpackage/${id}`, { headers: { Authorization: token } })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching package details", err);
        setLoading(false);
      });
  }, [id]);


  return (
    <div className="flex min-h-screen">
  {/* Sidebar/Navbar */}
  <Navbar />

  {/* Main content */}
  <div className="w-full p-6">
    {loading ? (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    ) : !data || !data.common_info ? (
      <div className="flex justify-center items-center h-[80vh]">
        <p className="text-xl text-gray-500 font-medium">No data found.</p>
      </div>
    ) : (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Registered Company Details
        </h2>

        {/* Restaurant Info */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <h3 className="text-xl font-semibold mb-2">Restaurant Info</h3>
          <p><strong>Name:</strong> {data.common_info.restaurant_name}</p>
          <p><strong>Email:</strong> {data.common_info.email}</p>
          <p><strong>Phone:</strong> {data.common_info.phone_number}</p>
          <p><strong>City:</strong> {data.common_info.city_name}, {data.common_info.state_name}</p>
          <p><strong>Country:</strong> {data.common_info.country_name}</p>
        </div>

        {/* Plans Table */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-3">Subscribed Plans</h3>
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Package</th>
                <th className="border p-2">Interval</th>
                <th className="border p-2">Start Date</th>
                <th className="border p-2">End Date</th>
                <th className="border p-2">Trial Date</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.plans.map((plan, idx) => (
                <tr key={idx} className="text-center">
                  <td className="border p-2">{plan.package_name}</td>
                  <td className="border p-2">
                    {plan.interval_value} {plan.price_interval}
                  </td>
                  <td className="border p-2">
                    {new Date(plan.start_date).toLocaleDateString()}
                  </td>
                  <td className="border p-2">
                    {new Date(plan.end_date).toLocaleDateString()}
                  </td>
                  <td className="border p-2">
                    {new Date(plan.trial_date).toLocaleDateString()}
                  </td>
                  <td className="border p-2 capitalize">
                    {plan.package_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>
</div>

  )
}

export default ManagePackagePage
