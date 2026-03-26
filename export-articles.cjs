const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM articoli ORDER BY nome ASC', [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  
  let csvContent = 'ID,Nome,Codice,Verniciati,Scorta\n';
  rows.forEach(row => {
    // Escape quotes in strings
    const nome = `"${row.nome.replace(/"/g, '""')}"`;
    const codice = `"${row.codice.replace(/"/g, '""')}"`;
    csvContent += `${row.id},${nome},${codice},${row.verniciati},${row.scorta}\n`;
  });
  
  fs.writeFileSync(path.join(__dirname, 'public', 'articoli.csv'), csvContent);
  console.log('Exported ' + rows.length + ' articles to public/articoli.csv');
});
