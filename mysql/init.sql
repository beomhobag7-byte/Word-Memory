CREATE DATABASE word_memory;
USE word_memory;

CREATE TABLE words (
    word_id INT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    part_of_speech VARCHAR(50),
    example_sentence TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wrong_notes (
    wrong_id INT AUTO_INCREMENT PRIMARY KEY,
    word_id INT NOT NULL,
    wrong_count INT DEFAULT 1,
    last_wrong_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   
    FOREIGN KEY (word_id) REFERENCES words(word_id)
        ON DELETE CASCADE
);

CREATE TABLE quiz_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    word_id INT NOT NULL,
    user_answer VARCHAR(255),
    is_correct BOOLEAN NOT NULL,
    solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (word_id) REFERENCES words(word_id)
        ON DELETE CASCADE
);