const http = require('http');

const body = JSON.stringify({
  senderData: {
    chatId: "120363426428569339@g.us"
  },
  messageData: {
    typeMessage: "textMessage",
    textMessageData: {
      textMessage: "אכלתי המבורגר עם צ'יפס וקולה"
    }
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook/whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', (e) => console.error(e));
req.write(body);
req.end();
