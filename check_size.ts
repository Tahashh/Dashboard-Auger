import fs from 'fs';
console.log('database.sqlite:', fs.statSync('database.sqlite').size);
console.log('db_copy.sqlite:', fs.statSync('db_copy.sqlite').size);
console.log('sqlite.db:', fs.statSync('sqlite.db').size);
