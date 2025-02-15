const qrcode = require('qrcode-terminal');
const express = require('express');
const server = express();
const port = 5000;
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios'); // Changed from node-fetch to axios

const phoneNumberFormatter = function (number) {
  let formatted = number.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substr(1);
  }

  if (!formatted.endsWith('@c.us')) {
    formatted += '@c.us';
  }
  return formatted;
}

const checkRegisteredNumber = async (number) => {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

const ensureAbsoluteUrl = (url) => {
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url;
};

const convertUrlToBase64 = async (url) => {
  try {
    url = ensureAbsoluteUrl(url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw new Error('Failed to convert URL to base64');
  }
};

server.use(bodyParser.json());
server.use(express.urlencoded({
  extended: true
}));

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu',],
  },
  webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html', }
});

client.initialize();


client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Whatsapp Ready!');
});

client.on('authenticated', () => {
  console.log('authenticated', 'Whatsapp is authenticated!');
  console.log('message', 'Whatsapp is authenticated!');

});

client.on('auth_failure', function (session) {
  console.log('message', 'Auth failure, restarting...');
});

client.on('disconnected', (reason) => {
  console.log('Client was logged out', reason);
  client.destroy();
  client.initialize();
});


server.use(cors('*'))

server.get('/whatsapp', (req, res) => {
  res.status(200).send("WhatsApp Chatbot Server by devnolife")
})


server.get('/whatsapp/check-number/:number', async (req, res) => {
  const number = phoneNumberFormatter(req.params.number);
  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      data: false,
      message: 'Nomor Whatsapp tidak terdaftar',
      code: 422
    });
  }
  return res.status(200).json({
    data: true,
    message: 'Nomor Whatsapp terdaftar',
    code: 200
  });
})

server.post('/whatsapp/send-message', async (req, res) => {
  const { number, message } = req.body
  const noHP = phoneNumberFormatter(number)
  const isRegisteredNumber = await checkRegisteredNumber(noHP);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      data: false,
      message: 'Nomor Whatsapp tidak terdaftar',
      code: 422
    });
  }

  await client.sendMessage(noHP, message)
    .then((data) => {
      res.status(200).json({
        data: null,
        code: 200,
        message: "Notifikasi Berhasil Dikirim"
      })
    })
    .catch((err) => {
      res.status(500).json({
        data: null,
        code: 500,
        message: "Notifikasi Gagal Dikirim"
      })
    })
})

server.post('/whatsapp/send-media', async (req, res) => {
  try {
    const { number,url ,caption } = req.body;
    const noHP = phoneNumberFormatter(number);
    const isRegisteredNumber = await checkRegisteredNumber(noHP);

    if (!isRegisteredNumber) {
      return res.status(422).json({
        data: false,
        message: 'Nomor Whatsapp tidak terdaftar',
        code: 422
      });
    }

    const media = await MessageMedia.fromUrl(url);
    await client.sendMessage(noHP, media , { caption: caption });

    res.status(200).json({
      data: null,
      code: 200,
      message: "Media Berhasil Dikirim"
    });
  } catch (err) {
    res.status(500).json({
      data: null,
      code: 500,
      message: "Media Gagal Dikirim"
    });
  }
});


server.listen(port, () => {
  console.log(`WhatsApp Server listening at http://localhost:${port}`)
})



