const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./fitness.db');

db.serialize(() => {
  db.all("SELECT username FROM users", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log("Exercise Types:");
    rows.forEach((row) => {
      console.log(row.name);
    });
  });
});

db.close();
