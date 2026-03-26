import fs from 'fs';
fetch('https://dashboard-auger-918014290557.us-west1.run.app/assets/index-BnFoE41Q.js')
  .then(r => r.text())
  .then(t => {
    const idx = t.indexOf('login-wrapper');
    console.log(t.substring(idx - 100, idx + 1000));
  });
