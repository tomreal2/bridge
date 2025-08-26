// app.js
const express     = require('express');
const { OBSWebSocket } = require('obs-websocket-js');

const app = express();
const obs = new OBSWebSocket();

app.use(express.json());

async function ensureConnected() {
  if (!obs._connected) {
    // await obs.connect({
    //   url:      'ws://192.168.1.69:4455',
    //   password: 'pullmyfinger'
    // });
    await obs.connect('ws://192.168.1.69:4455', 'pullmyfinger');
    console.log('✅ Connected to OBS WebSocket');
  }
}

app.post('/scene', async (req, res) => {
  const { name } = req.body;
  console.log(`Changing scene to: ${name}`);
  try {
    await ensureConnected();
    await obs.call('SetCurrentProgramScene', { sceneName: name });
    console.log(`✅ Scene switched to "${name}"`);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error changing scene:', err.message);
    res.status(500).send('Failed to change scene');
  }
});

app.post('/scene-item', async (req, res) => {
  const { sceneName, itemName, visible } = req.body;
  try {
    await ensureConnected();
    const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
    const match = sceneItems.find(si => si.sourceName === itemName);
    if (!match) {
      console.error(`❌ "${itemName}" not found in "${sceneName}"`);
      return res.status(404).send('Scene item not found');
    }
    await obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId:      match.sceneItemId,
      sceneItemEnabled: visible
    });
    console.log(`✅ "${itemName}" visibility → ${visible}`);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error setting scene item visibility:', err.message);
    res.status(500).send('Failed to set visibility');
  }
});

app.post('/recording/start', async (req, res) => {
  console.log('Starting recording…');
  try {
    await ensureConnected();
    await obs.call('StartRecord');      // ← v5 method name
    console.log('✅ Recording started');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error starting recording:', err.message);
    res.status(500).send('Failed to start recording');
  }
});

app.post('/recording/stop', async (req, res) => {
  console.log('Stopping recording…');
  try {
    await ensureConnected();
    await obs.call('StopRecord');       // ← v5 method name
    console.log('✅ Recording stopped');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error stopping recording:', err.message);
    res.status(500).send('Failed to stop recording');
  }
});

const PORT = 4457;
app.listen(PORT, () => {
  console.log(`HTTP→OBS bridge listening on http://localhost:${PORT}`);
});