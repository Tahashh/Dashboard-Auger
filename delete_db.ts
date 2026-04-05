import fs from 'fs';
try { fs.unlinkSync('database.sqlite'); } catch (e) {}
try { fs.unlinkSync('database.sqlite-shm'); } catch (e) {}
try { fs.unlinkSync('database.sqlite-wal'); } catch (e) {}
console.log('Deleted corrupted database files.');
