const db = require("../utils/db");

const createFloor = (req, res) => {
  const { floorName } = req.body;
  const user_id = req.id;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // User has a subscription, proceed to insert
      const created_by = results[0].user_id;

      const createFloorQuery = `INSERT INTO tbl_tablefloor (floorName, created_by) VALUES (?, ?)`;
      db.pool.query(createFloorQuery, [floorName, created_by], (err) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .json({ success: false, message: "An error occurred" });
        } else {
          return res.status(201).json({
            success: true,
            message: "Floor created successfully (via subscription)",
          });
        }
      });
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res
            .status(403)
            .json({ message: "You are not authorized to create a floor." });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, results) => {
            if (err) return res.status(500).send(err);

            if (results.length > 0) {
              const createFloorQuery = `INSERT INTO tbl_tablefloor (floorName, created_by) VALUES (?, ?)`;
              db.pool.query(
                createFloorQuery,
                [floorName, created_by],
                (err) => {
                  if (err) {
                    console.log(err);
                    return res
                      .status(500)
                      .json({ success: false, message: "An error occurred" });
                  } else {
                    return res.status(201).json({
                      success: true,
                      message: "Floor created successfully (via creator)",
                    });
                  }
                },
              );
            } else {
              return res.status(403).json({
                message: "Creator does not have an active subscription.",
              });
            }
          },
        );
      });
    }
  });
};
const getFloors = (req, res) => {
  try {
    const id = req.id; // From auth middleware
    const { searchItem } = req.query;

    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [id], (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: err });
      }

      if (data.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      const isAdmin = data[0].is_admin;
      const created_by = data[0].created_by;

      let getFloorsQuery;
      let queryParams = [];

      if (isAdmin === 1) {
        // Admin: get floors created by themselves
        if (!searchItem || searchItem.trim() === "") {
          getFloorsQuery = `
            SELECT * FROM tbl_tablefloor
            WHERE created_by = ?
            ORDER BY tbfloorid DESC
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getFloorsQuery = `
            SELECT * FROM tbl_tablefloor
            WHERE created_by = ?
            AND floorName LIKE ?
            ORDER BY tbfloorid DESC
          `;
          queryParams = [id, searchQuery];
        }
      } else {
        // Non-admin: get floors created by the admin who created them
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view floors.",
          });
        }

        if (!searchItem || searchItem.trim() === "") {
          getFloorsQuery = `
            SELECT * FROM tbl_tablefloor
            WHERE created_by = ?
            ORDER BY tbfloorid DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getFloorsQuery = `
            SELECT * FROM tbl_tablefloor
            WHERE created_by = ?
            AND floorName LIKE ?
            ORDER BY tbfloorid DESC
          `;
          queryParams = [created_by, searchQuery];
        }
      }

      db.pool.query(getFloorsQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching floors:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching floors",
            error: err,
          });
        }

        res.status(200).json({
          success: true,
          data: result,
          message: "Floors fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

const syncFloors = async (req, res) => {
  try {
    const floors = req.body;

    if (!Array.isArray(floors)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    for (const floor of floors) {
      await db.query(
        `
        INSERT INTO tbl_tablefloor
        (
          uuid,
          floorName,
          created_by
        )
        VALUES (?, ?, ?)

        ON DUPLICATE KEY UPDATE
          floorName = VALUES(floorName)
      `,
        [floor.uuid, floor.floorName, floor.created_by],
      );
    }

    res.json({
      success: true,
      message: "Floors synced successfully",
    });
  } catch (error) {
    console.log("FLOOR SYNC ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const { floorName } = req.body;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by: userCreatedBy } = userResult[0];
      const creatorId = is_admin === 1 ? userId : userCreatedBy;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const fetchCurrentDataSql = "SELECT * FROM tbl_tablefloor WHERE tbfloorid = ? AND created_by = ?";
      db.pool.query(fetchCurrentDataSql, [id, creatorId], (fetchErr, fetchData) => {
        if (fetchErr) {
          console.error("Database fetch error:", fetchErr);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (fetchData.length === 0) {
          return res.status(404).json({ success: false, message: "Floor record not found" });
        }
        const currentData = fetchData[0];
        const updatedData = {
          floorName: floorName !== undefined ? floorName : currentData.floorName,
          created_by: currentData.created_by,
        };
        const updateFloorQuery = `UPDATE tbl_tablefloor SET floorName = ?, created_by = ? WHERE tbfloorid = ?`;
        db.pool.query(updateFloorQuery, [updatedData.floorName, updatedData.created_by, id], (updateErr, result) => {
          if (updateErr) {
            console.error("Database update error:", updateErr);
            return res.status(500).json({ success: false, message: "An error occurred" });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Floor record not found" });
          }
          return res.status(200).json({ success: true, message: "Floor updated successfully" });
        });
      });
    });
  } catch (error) {
    console.error("Update floor error:", error);
    return res.status(500).json({ success: false, message: "An error occurred" });
  }
};

// get by id
const getFloorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Floor ID is required" });
    }

    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getFloorByIdQuery = `SELECT * FROM tbl_tablefloor WHERE tbfloorid = ? AND created_by = ?`;
      db.pool.query(getFloorByIdQuery, [id, creatorId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "Floor not found" });
        }
        res.status(200).json({ success: true, data: result[0], message: "Floor fetched successfully" });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const deleteFloor = async (req, res) => {
  try {
    const { floorID } = req.params;
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const deleteFloorQuery = `DELETE FROM tbl_tablefloor WHERE tbfloorid = ? AND created_by = ?`;
      db.pool.query(deleteFloorQuery, [floorID, creatorId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ success: false, message: "An error occurred while deleting the floor" });
        } else if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Floor not found" });
        } else {
          return res.status(200).json({ success: true, message: "Floor deleted successfully" });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};
module.exports = {
  createFloor,
  getFloors,
  syncFloors,
  deleteFloor,
  updateFloor,
  getFloorById,
};
