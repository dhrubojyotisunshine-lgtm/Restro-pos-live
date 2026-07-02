const express = require("express");
const router = express.Router();
const auth=require("../middleware/authicantejwt");
const reservationController =require("../controllers/reservationController")
  //all unavailability page routs
  router.post('/unavailability',auth, reservationController.createUnavailability);
 router.get('/unavailability',auth,reservationController.getUnavailability);
  router.get('/unavailability/:id', auth, reservationController.getUnavailabilitybyid)
  router.put('/unavailability/:id', auth, reservationController.updateUnavailability);
  router.delete('/unavailability/:id', auth, reservationController.deleteUnavailability);
  // get reservation data
  router.get('/reservation',auth,reservationController.getReservations)
  // delete reservation
  router.delete('/reservation/:id', auth, reservationController.deleteReservation)
  router.get('/tableunbookbyid/:tableid', auth, reservationController.getTableByIdreservation)
  router.get("/reservation/:id", auth, reservationController.getReservationById);
  router.put("/reservationbook/:reserveid", auth, reservationController.updateReservationAndCustomer);
  // create reservation
  router.post("/reservationbook",auth,reservationController.createReservation);

  // get all free table for booking
  router.get('/getavailablereservationtables',auth,reservationController.getavailablereservationtables)

  // Reservation setting
  router.put('/setting/:id', auth, reservationController.updatereservationsetting);

module.exports =router
