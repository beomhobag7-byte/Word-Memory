const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// HTML 파일 제공
app.use(express.static(path.join(__dirname, "src")));

// MySQL 연결
const db = mysql.createConnection({
  host: "mysql",
  user: "root",
  password: "1234",
  database: "tutorial_db"
});

db.connect((err) => {
  if (err) {
    console.error("MySQL 연결 실패:", err);
    return;
  }
  console.log("MySQL 연결 성공!");
});

// DB 데이터 가져오기
app.get("/api/messages", (req, res) => {
  const sql = "SELECT * FROM messages";

  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).json({ error: "DB 조회 실패" });
      return;
    }

    res.json(results);
  });
});

// DB에 데이터 추가하기
app.post("/api/messages", (req, res) => {
  const { content } = req.body;

  const sql = "INSERT INTO messages (content) VALUES (?)";

  db.query(sql, [content], (err, result) => {
    if (err) {
      res.status(500).json({ error: "DB 저장 실패" });
      return;
    }

    res.json({ message: "저장 성공", id: result.insertId });
  });
});

app.listen(3000, () => {
  console.log("서버 실행 중: http://localhost:3000");
});