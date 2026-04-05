import fs from 'fs';
const buffer = fs.readFileSync('database.sqlite');
let strings = [];
let current = '';
for (let i = 0; i < buffer.length; i++) {
  const char = buffer[i];
  if (char >= 32 && char <= 126) {
    current += String.fromCharCode(char);
  } else {
    if (current.length >= 4) {
      strings.push(current);
    }
    current = '';
  }
}
fs.writeFileSync('recovered.txt', strings.join('\n'));
console.log('Done');
