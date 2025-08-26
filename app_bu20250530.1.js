const express       = require('express');
const { OBSWebSocket } = require('obs-websocket-js');
const { execFile }  = require('child_process');

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
    await obs.call('StartRecord');
    console.log('✅ Recording started');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error starting recording:', err.message);
    res.status(500).send('Failed to start recording');
  }
});

// app.post('/recording/stop', async (req, res) => {
//   console.log('Stopping recording…');
//   try {
//     await ensureConnected();
//     await obs.call('StopRecord');
//     console.log('✅ Recording stopped');
//     res.sendStatus(204);
//   } catch (err) {
//     console.error('❌ Error stopping recording:', err.message);
//     res.status(500).send('Failed to stop recording');
//   }
// });

app.post('/recording/stop', async (req, res) => {
  console.log('Stopping recording…');
  try {
    await ensureConnected();

    // check if OBS is currently recording
    const { outputActive } = await obs.call('GetRecordStatus');
    if (!outputActive) {
      console.log('ℹ️ No active recording to stop.');
      return res.sendStatus(204);
    }

    await obs.call('StopRecord');
    console.log('✅ Recording stopped');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error stopping recording:', err.message);
    res.status(500).send('Failed to stop recording');
  }
});

// New endpoint: run the toggle-fox-cams.sh script
app.get('/sync', (req, res) => {
  console.log('🔄 Toggling fox cams via script…');
  execFile('/home/tom/dev/scripts/toggle-fox-cams.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error toggling fox cams:', error.message);
      return res.status(500).send('Failed to toggle fox cams');
    }
    console.log(`🔄 Fox cams toggled. Output:\n${stdout}`);
    res.sendStatus(204);
  });
});

const PORT = 4457;
app.listen(PORT, () => {
  console.log(`HTTP→OBS bridge listening on http://localhost:${PORT}`);
});