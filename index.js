var express = require("express");
var app = express();
var fs = require("fs");
var sql = require("mssql");
const os = require("os");
const port = 3001;
const cors = require("cors");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const moment = require("moment-timezone");
// การกำหนดค่าการเชื่อมต่อฐานข้อมูล SQL Server
require("./sse-server");
const config = {
  user: "sa",
  password: "123456",
  server: "DESKTOP-DJBDNTC",
  database: "KSBR_Queue",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    trustedconnection: true,
    enableArithAbort: true,
    instancename: "",
  },
};
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// กำหนดโฟลเดอร์ที่เก็บรูป
const imageFolder = "C:\\images";

// สร้าง API สำหรับดึงรูป
app.get("/api/images", (req, res) => {
  fs.readdir(imageFolder, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan directory: " + err);
    }

    // กรองเฉพาะไฟล์ที่เป็นรูป
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif)$/i.test(file)
    );

    // สร้าง URL สำหรับรูปแต่ละรูป
    const imageUrls = imageFiles.map(
      (file) => `http://localhost:${port}/images/${file}`
    );

    res.json(imageUrls);
  });
});

// เสิร์ฟรูปจากโฟลเดอร์
app.use("/images", express.static(imageFolder));

app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ตัวอย่าง: ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query("SELECT * FROM KMH_QUEUE ORDER BY MWhen DESC;");
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 1000);
});
// app.get("/api/queue", (req, res) => {
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   const sendSSE = (data) => {
//     res.write(`data: ${JSON.stringify(data)}\n\n`);
//   };

//   // ตัวอย่าง: ส่งข้อมูลทุก 1 วินาที
//   setInterval(async () => {
//     try {
//       const pool = await sql.connect(config);
//       const result = await pool.request().query("SELECT  * FROM KMH_QUEUE ");
//       const data = result.recordset;
//       sendSSE(data);
//     } catch (error) {
//       console.error("Error fetching data from SQL Server:", error);
//     }
//   }, 1000);
// });

app.get("/api/KMH_QUEUEr", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  //  ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 2 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 5000);
});
const TIMEOUT_DURATION = 30000;

app.get("/api/KMH_QUEUErWait", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const fetchDataFromDB = async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 10 * FROM KMH_QUEUE Where PresStatus = 1 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  };

  const fetchDataWithTimeout = () => {
    // เริ่มต้นการรอข้อมูลจาก SQL Server
    const fetchDataPromise = fetchDataFromDB();

    // กำหนดการ Timeout ด้วย setTimeout
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("TimeoutError: operation timed out"));
      }, TIMEOUT_DURATION);
    });

    // รอการดำเนินการจนกว่าจะได้ผลลัพธ์หรือ Timeout
    Promise.race([fetchDataPromise, timeoutPromise])
      .then(() => {
        // ทำอะไรก็ตามที่คุณต้องการหลังจากได้ข้อมูลหรือ Timeout
      })
      .catch((error) => {
        console.error(error);
        // ให้ทำการส่งข้อความข้อผิดพลาดกลับไปยัง client
        res.status(500).send("TimeoutError: operation timed out");
      });
  };

  // เริ่มต้นการรอข้อมูลจาก SQL Server
  fetchDataWithTimeout();
});

app.get("/api/queueFinanceRoom", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  //  ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 4 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 5000);
});

app.get("/api/queueFinance", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ตัวอย่าง: ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 4 ORDER BY MWhen DESC;"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 5000);
});
app.get("/api/KMH_QUEUErWaitFinance", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const fetchDataFromDB = async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 10 * FROM KMH_QUEUE Where PresStatus = 3 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  };

  const fetchDataWithTimeout = () => {
    // เริ่มต้นการรอข้อมูลจาก SQL Server
    const fetchDataPromise = fetchDataFromDB();

    // กำหนดการ Timeout ด้วย setTimeout
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("TimeoutError: operation timed out"));
      }, TIMEOUT_DURATION);
    });

    // รอการดำเนินการจนกว่าจะได้ผลลัพธ์หรือ Timeout
    Promise.race([fetchDataPromise, timeoutPromise])
      .then(() => {
        // ทำอะไรก็ตามที่คุณต้องการหลังจากได้ข้อมูลหรือ Timeout
      })
      .catch((error) => {
        console.error(error);
        // ให้ทำการส่งข้อความข้อผิดพลาดกลับไปยัง client
        res.status(500).send("TimeoutError: operation timed out");
      });
  };

  // เริ่มต้นการรอข้อมูลจาก SQL Server
  fetchDataWithTimeout();
});

app.get("/api/queueDrugRoom", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  //  ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 6 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 1000);
});
app.get("/api/queueDrug", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ตัวอย่าง: ส่งข้อมูลทุก 1 วินาที
  setInterval(async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 6 ORDER BY MWhen DESC;"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  }, 1000);
});

app.get("/api/KMH_QUEUErWaitDrug", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const fetchDataFromDB = async () => {
    try {
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .query(
          "SELECT TOP 10 * FROM KMH_QUEUE Where PresStatus = 5 ORDER BY MWhen DESC"
        );
      const data = result.recordset;
      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from SQL Server:", error);
    }
  };

  const fetchDataWithTimeout = () => {
    // เริ่มต้นการรอข้อมูลจาก SQL Server
    const fetchDataPromise = fetchDataFromDB();

    // กำหนดการ Timeout ด้วย setTimeout
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("TimeoutError: operation timed out"));
      }, TIMEOUT_DURATION);
    });

    // รอการดำเนินการจนกว่าจะได้ผลลัพธ์หรือ Timeout
    Promise.race([fetchDataPromise, timeoutPromise])
      .then(() => {
        // ทำอะไรก็ตามที่คุณต้องการหลังจากได้ข้อมูลหรือ Timeout
      })
      .catch((error) => {
        console.error(error);
        // ให้ทำการส่งข้อความข้อผิดพลาดกลับไปยัง client
        res.status(500).send("TimeoutError: operation timed out");
      });
  };

  // เริ่มต้นการรอข้อมูลจาก SQL Server
  fetchDataWithTimeout();
});
// สร้างเส้นทาง API เพื่ออ่านข้อมูลจากตาราง KMH_QUEUEr
// app.get("/api/KMH_QUEUEr", async (req, res) => {
//   try {
//     // เชื่อมต่อกับฐานข้อมูล
//     await sql.connect(config);

//     // ทำคำสั่ง SQL เพื่อดึงข้อมูล
//     const result = await sql.query`SELECT * FROM KMH_QUEUE ORDER BY MWhen DESC`;
//     // ปิดการเชื่อมต่อกับฐานข้อมูล
//     await sql.close();

//     res.json(result.recordset);
//   } catch (err) {
//     console.error("Error:", err.message);
//     res.status(500).send("Internal Server Error");
//   }
// });

app.put("/api/updatestatus/:VisitNumber", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const { VisitNumber } = req.params;
    const { room, PresStatus } = req.body;
    console.log(room);
    const Time = Date.now();
    console.log(Time);
    let result = await pool
      .request()
      .input("VisitNumber", sql.VarChar(3), VisitNumber)
      .input("Rooms", sql.NVarChar(100), room)
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("Time", sql.DateTime, new Date(Time))
      .query`UPDATE KMH_QUEUEr SET PresStatus = @PresStatus, Rooms = @Rooms, Time = @Time WHERE VisitNumber = @VisitNumber`;
    res.send("PresStatus updated successfully");
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/queueTest", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 4 ORDER BY MWhen DESC"
      );

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching User from the database");
  }
});
app.get("/api/queueTest2", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 2 ORDER BY MWhen DESC"
      );
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching User from the database");
  }
});
app.get("/api/queueF", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 4 ORDER BY MWhen DESC"
      );

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching User from the database");
  }
});
app.get("/api/queueD", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TOP 1 * FROM KMH_QUEUE Where PresStatus = 6 ORDER BY MWhen DESC"
      );

    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching User from the database");
  }
});

// app.get("/api/process", (req, res) => {
//   fs.readFile("QKMH_Process.json", "utf8", (err, data) => {
//     if (err) {
//       console.error("Error reading file:", err);
//       res.status(500).send("Error reading file");
//       return;
//     }
//     try {
//       const jsonData = JSON.parse(data);
//       setInterval(() => {
//         res.json(jsonData);
//       }, 2000);
//     } catch (parseError) {
//       console.error("Error parsing JSON:", parseError);
//       res.status(500).send("Error parsing JSON");
//     }
//   });
// });

const networkFilePath = "C:\\Users\\KSBR\\Downloads\\QKMH_Process.json";

app.get("/api/QKMH_Process", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  let interval;
  // ส่งข้อมูลกลับไปยัง client ทุก 3 วินาที
  interval = setInterval(() => {
    try {
      // อ่านข้อมูลจากไฟล์ JSON ในเครือข่าย
      const data = fs.readFileSync(networkFilePath, "utf-8");
      // แปลงข้อมูล JSON
      const jsonData = JSON.parse(data);
      sendSSE(jsonData);
    } catch (error) {
      console.error("Error fetching data from JSON file:", error);
    }
  }, 1000);
  // เมื่อ client ปิดการเชื่อมต่อ
  res.on("close", () => {
    clearInterval(interval);
  });
});

app.post("/api/update-room", async (req, res) => {
  const { VisitNumber, Rooms, PresStatus } = req.body;

  try {
    // Connect to the database
    let pool = await sql.connect(config);

    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");

    // Update the queue
    const updateQuery = `
      UPDATE KMH_QUEUE 
      SET PresStatus = @PresStatus, 
          Rooms = @Rooms, 
          MWhen = @MWhen 
      WHERE VisitNumber = @VisitNumber
    `;

    const request = pool
      .request()
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("Rooms", sql.VarChar, Rooms)
      .input("VisitNumber", sql.VarChar, VisitNumber)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});
app.post("/api/update_room_Finace", async (req, res) => {
  const { VisitNumber, PresStatus } = req.body;

  try {
    // Connect to the database
    let pool = await sql.connect(config);

    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");

    // Update the queue
    const updateQuery = `
      UPDATE KMH_QUEUE 
      SET PresStatus = @PresStatus, 
          MWhen = @MWhen 
      WHERE VisitNumber = @VisitNumber
    `;

    const request = pool
      .request()
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("VisitNumber", sql.VarChar, VisitNumber)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});
app.post("/api/updatecall", async (req, res) => {
  const { VisitNumber, Station } = req.body;

  try {
    // Connect to the database
    let pool = await sql.connect(config);
    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");

    // Update the queue
    const updateQuery = `
      UPDATE KMH_QUEUE 
      SET 
          MWhen = @MWhen 
      WHERE VisitNumber = @VisitNumber and Station = @Station
    `;

    const request = pool
      .request()
      .input("VisitNumber", sql.VarChar, VisitNumber)
      .input("Station", sql.Int, Station)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});
app.post("/api/updatecallDrugaAndFinace", async (req, res) => {
  const { VisitNumber, PresStatus } = req.body;
  try {
    // Connect to the database
    let pool = await sql.connect(config);
    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");

    // Update the queue
    const updateQuery = `
      UPDATE KMH_QUEUE 
      SET 
          MWhen = @MWhen 
      WHERE VisitNumber = @VisitNumber and PresStatus = @PresStatus
    `;

    const request = pool
      .request()
      .input("VisitNumber", sql.VarChar, VisitNumber)
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

app.post("/api/updatebreak", async (req, res) => {
  const { Station } = req.body;
  try {
    let pool = await sql.connect(config);
    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");
    let PresStatus = "Waiting_to_pay";
    // Update the queue
    const updateQuery = `
    UPDATE KMH_QUEUE 
    SET PresStatus = @PresStatus ,
        MWhen = @MWhen
    WHERE Station = @Station AND PresStatus = 'Sent_to_doctor'
    `;

    const request = pool
      .request()
      .input("Station", sql.Int, Station)
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});
app.post("/api/updatebreakFinace", async (req, res) => {
  const { Station } = req.body;
  try {
    let pool = await sql.connect(config);
    // คำนวณเวลาใน TimeZone ของไทย
    const thaiTime = moment.tz("Asia/Bangkok");
    const EntryDatetime = thaiTime.format("YYYY-MM-DD HH:mm:ss");
    let PresStatus = "Waiting_to_pay";
    // Update the queue
    const updateQuery = `
    UPDATE KMH_QUEUE 
    SET PresStatus = @PresStatus ,
        MWhen = @MWhen
    WHERE Station = @Station AND PresStatus = 'Sent_to_doctor'
    `;

    const request = pool
      .request()
      .input("Station", sql.Int, Station)
      .input("PresStatus", sql.VarChar, PresStatus)
      .input("MWhen", sql.VarChar, EntryDatetime);

    await request.query(updateQuery);

    // Respond with a success message
    res.json({ message: "Queue updated successfully" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database query error" });
  }
});
app.get("/api/queue", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  let interval;
  // ส่งข้อมูลกลับไปยัง client ทุก 3 วินาที
  interval = setInterval(async () => {
    try {
      // อ่านข้อมูลจากไฟล์ JSON ในเครือข่าย
      const pool = await sql.connect(config);
      const result = await pool.request().query("SELECT * FROM KMH_QUEUE");
      const data = result.recordset;

      sendSSE(data);
    } catch (error) {
      console.error("Error fetching data from JSON file:", error);
    }
  }, 1000);
  // เมื่อ client ปิดการเชื่อมต่อ
  res.on("close", () => {
    clearInterval(interval);
  });
});

app.listen(port, function () {
  console.log("Example app listening on port", port);
});
