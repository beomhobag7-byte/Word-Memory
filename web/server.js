const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

const ADMIN_CODE = "rockclub007#";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));

const db = mysql.createPool({
  host: "mysql",
  user: "root",
  password: "1234",
  database: "word_memory",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function testDBConnection() {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("MySQL 연결 실패, 3초 후 재시도:", err.message);
      setTimeout(testDBConnection, 3000);
      return;
    }

    console.log("MySQL 연결 성공!");
  });
}

testDBConnection();

function checkAdmin(req, res) {
  const { admin_code } = req.body;

  if (admin_code !== ADMIN_CODE) {
    res.status(403).json({ error: "관리자만 사용할 수 있는 기능입니다." });
    return false;
  }

  return true;
}

app.get("/api/words", (req, res) => {
  const sql = `
    SELECT 
      word_id,
      word,
      meaning,
      part_of_speech,
      example_sentence,
      example_meaning,
      created_at
    FROM words
    ORDER BY word_id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("단어 조회 실패:", err);
      res.status(500).json({ error: "단어 조회 실패" });
      return;
    }

    res.json(results);
  });
});

app.get("/api/quiz", (req, res) => {
  const sql = `
    SELECT 
      word_id,
      word,
      meaning,
      part_of_speech,
      example_sentence,
      example_meaning
    FROM words
    ORDER BY RAND()
    LIMIT 1
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("퀴즈 조회 실패:", err);
      res.status(500).json({ error: "퀴즈 조회 실패" });
      return;
    }

    if (results.length === 0) {
      res.json(null);
      return;
    }

    res.json(results[0]);
  });
});

app.post("/api/words", (req, res) => {
  if (!checkAdmin(req, res)) return;

  const {
    word,
    meaning,
    part_of_speech,
    example_sentence,
    example_meaning
  } = req.body;

  if (!word || !meaning) {
    res.status(400).json({ error: "단어와 뜻은 필수입니다." });
    return;
  }

  const sql = `
    INSERT INTO words
    (word, meaning, part_of_speech, example_sentence, example_meaning)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [word, meaning, part_of_speech, example_sentence, example_meaning],
    (err, result) => {
      if (err) {
        console.error("단어 저장 실패:", err);
        res.status(500).json({ error: "단어 저장 실패" });
        return;
      }

      res.json({
        message: "단어 저장 성공",
        word_id: result.insertId
      });
    }
  );
});

app.post("/api/words/bulk", (req, res) => {
  if (!checkAdmin(req, res)) return;

  const { words } = req.body;

  if (!Array.isArray(words) || words.length === 0) {
    res.status(400).json({ error: "저장할 단어가 없습니다." });
    return;
  }

  const values = words
    .filter(item => item.word && item.meaning)
    .map(item => [
      item.word,
      item.meaning,
      item.part_of_speech || "",
      item.example_sentence || "",
      item.example_meaning || ""
    ]);

  if (values.length === 0) {
    res.status(400).json({ error: "올바른 단어 데이터가 없습니다." });
    return;
  }

  const sql = `
    INSERT INTO words
    (word, meaning, part_of_speech, example_sentence, example_meaning)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("여러 단어 저장 실패:", err);
      res.status(500).json({ error: "여러 단어 저장 실패" });
      return;
    }

    res.json({
      message: "여러 단어 저장 성공",
      inserted_count: result.affectedRows
    });
  });
});

app.delete("/api/words/:id", (req, res) => {
  const { admin_code } = req.body;

  if (admin_code !== ADMIN_CODE) {
    res.status(403).json({ error: "관리자만 단어를 삭제할 수 있습니다." });
    return;
  }

  const wordId = req.params.id;
  const sql = "DELETE FROM words WHERE word_id = ?";

  db.query(sql, [wordId], (err, result) => {
    if (err) {
      console.error("단어 삭제 실패:", err);
      res.status(500).json({ error: "단어 삭제 실패" });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "삭제할 단어를 찾지 못했습니다." });
      return;
    }

    res.json({ message: "단어 삭제 성공" });
  });
});

app.post("/api/quiz-logs", (req, res) => {
  const { word_id, user_answer, is_correct } = req.body;

  const sql = `
    INSERT INTO quiz_logs
    (word_id, user_answer, is_correct)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [word_id, user_answer, is_correct], (err, result) => {
    if (err) {
      console.error("퀴즈 기록 저장 실패:", err);
      res.status(500).json({ error: "퀴즈 기록 저장 실패" });
      return;
    }

    res.json({
      message: "퀴즈 기록 저장 성공",
      log_id: result.insertId
    });
  });
});

app.post("/api/wrong-notes", (req, res) => {
  const { word_id } = req.body;

  const checkSql = "SELECT * FROM wrong_notes WHERE word_id = ?";

  db.query(checkSql, [word_id], (err, results) => {
    if (err) {
      console.error("오답 노트 조회 실패:", err);
      res.status(500).json({ error: "오답 노트 조회 실패" });
      return;
    }

    if (results.length > 0) {
      const updateSql = `
        UPDATE wrong_notes
        SET wrong_count = wrong_count + 1,
            last_wrong_at = CURRENT_TIMESTAMP
        WHERE word_id = ?
      `;

      db.query(updateSql, [word_id], (err) => {
        if (err) {
          console.error("오답 노트 업데이트 실패:", err);
          res.status(500).json({ error: "오답 노트 업데이트 실패" });
          return;
        }

        res.json({ message: "오답 노트 업데이트 성공" });
      });
    } else {
      const insertSql = `
        INSERT INTO wrong_notes
        (word_id, wrong_count)
        VALUES (?, 1)
      `;

      db.query(insertSql, [word_id], (err, result) => {
        if (err) {
          console.error("오답 노트 저장 실패:", err);
          res.status(500).json({ error: "오답 노트 저장 실패" });
          return;
        }

        res.json({
          message: "오답 노트 저장 성공",
          wrong_id: result.insertId
        });
      });
    }
  });
});

app.get("/api/wrong-notes", (req, res) => {
  const sql = `
    SELECT 
      wrong_notes.wrong_id,
      wrong_notes.word_id,
      wrong_notes.wrong_count,
      wrong_notes.last_wrong_at,
      words.word,
      words.meaning,
      words.part_of_speech,
      words.example_sentence,
      words.example_meaning
    FROM wrong_notes
    JOIN words ON wrong_notes.word_id = words.word_id
    ORDER BY wrong_notes.last_wrong_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("오답 노트 조회 실패:", err);
      res.status(500).json({ error: "오답 노트 조회 실패" });
      return;
    }

    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("서버 실행 중: http://localhost:3000");
});