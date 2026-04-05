import fs from 'fs';
console.log('database.sqlite:', fs.statSync('database.sqlite').mtime);
console.log('db_copy.sqlite:', fs.statSync('db_copy.sqlite').mtime);
console.log('sqlite.db:', fs.statSync('sqlite.db').mtime);
