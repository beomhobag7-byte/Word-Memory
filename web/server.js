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
  database: "word_memory"
});

db.connect((err) => {
  if (err) {
    console.error("MySQL 연결 실패:", err);
    return;
  }
  console.log("MySQL 연결 성공!");
});

// 저장된 단어 전체 가져오기
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

// 랜덤 퀴즈 단어 하나 가져오기
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

// 새 단어 저장하기
app.post("/api/words", (req, res) => {
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
    [
      word,
      meaning,
      part_of_speech,
      example_sentence,
      example_meaning
    ],
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

// 퀴즈 기록 저장하기
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

// 오답 노트 저장 또는 업데이트하기
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

// 오답 노트 가져오기
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