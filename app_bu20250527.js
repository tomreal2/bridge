// app.js
const express = require('express');
const { OBSWebSocket } = require('obs-websocket-js');

const app = express();
const obs = new OBSWebSocket();

app.use(express.json());

app.post('/scene', async (req, res) => {
  const { name } = req.body;
  console.log(`Changing scene to: ${name}`);

  try {
    if (!obs._connected) {
      // Two-arg overload: URL string + password
      await obs.connect('ws://192.168.1.69:4455', 'pullmyfinger');
      console.log('✅ Connected to OBS WebSocket');
    }
    await obs.call('SetCurrentProgramScene', { sceneName: name });
    console.log(`✅ Scene switched to "${name}"`);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error changing scene:', err.message);
    res.status(500).send('Failed to change scene');
  }
});

const PORT = 4457;
app.listen(PORT, () => {
  console.log(`HTTP→OBS bridge listening on http://localhost:${PORT}`);
});