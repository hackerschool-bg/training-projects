let fetch = require("node-fetch");

for (let i = 0; i < 50; i++) {
  fetch('http://127.0.0.1:3001/api/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({city: 'Sofia', key: 'rQMdEUdSPGHOaaY0'}),
    }
  );
}
