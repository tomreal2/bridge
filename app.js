const express       = require('express');
const { OBSWebSocket } = require('obs-websocket-js');
const { execFile }  = require('child_process');

const app = express();
const obs = new OBSWebSocket();

app.use(express.json());

async function ensureConnected() {
  if (!obs._connected) {
    await obs.connect('ws://192.168.1.69:4455', 'pullmyfinger');
    console.log('✅ Connected to OBS WebSocket');
  }
}

// Change program scene
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

// Toggle visibility of a scene item
app.post('/scene-item', async (req, res) => {
  const { sceneName, itemName, visible } = req.body;
  try {
    await ensureConnected();
    const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
    const match = sceneItems.find(si => si.sourceName === itemName);
    if (!match) return res.status(404).send('Scene item not found');
    await obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: match.sceneItemId,
      sceneItemEnabled: visible
    });
    console.log(`✅ "${itemName}" visibility → ${visible}`);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error setting scene item visibility:', err.message);
    res.status(500).send('Failed to set visibility');
  }
});

// Start recording
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

// Stop recording (only if active)
app.post('/recording/stop', async (req, res) => {
  console.log('Stopping recording…');
  try {
    await ensureConnected();
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

// Start streaming
app.post('/stream/start', async (req, res) => {
  console.log('Starting stream…');
  try {
    await ensureConnected();

    console.log("getting streaming status");
    const { outputActive } = await obs.call('GetStreamStatus');
    if (outputActive) {
      console.log('ℹ️ Stream already active.');
      return res.sendStatus(204);
    }

    await obs.call('StartStream');
    console.log('✅ Stream started');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error starting stream:', err.message);
    res.status(500).send('Failed to start stream');
  }
});

// Stop streaming (only if active)
app.post('/stream/stop', async (req, res) => {
  console.log('Stopping stream…');
  try {
    await ensureConnected();
    console.log("getting streaming status");
    const { outputActive } = await obs.call('GetStreamStatus');
    //const streaming = await obs.call('GetStreamStatus');
    
    console.log("got streaming status");
    if (!outputActive) {
      console.log('ℹ️ No active stream to stop.');
      return res.sendStatus(204);
    }
    console.log('stopping Stream');
    await obs.call('StopStream');
    console.log('✅ Stream stopped');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Error stopping stream:', err.message);
    res.status(500).send('Failed to stop stream');
  }
});

// Toggle fox cams via your existing shell script
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

// Zoom in on bird feeder
app.get('/feeder', (req, res) => {
  console.log('🔄 Zoom in on bird feeder via script…');
  execFile('/home/tom/dev/scripts/feeder.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error zooming in on feeder:', error.message);
      return res.status(500).send('Failed to zoom in on feeder');
    }
    console.log(`🔄 Zoomed in on bird feeder. Output:\n${stdout}`);
    res.sendStatus(204);
  });
});

const PORT = 4457;
app.listen(PORT, () => {
  console.log(`HTTP→OBS bridge listening on http://localhost:${PORT}`);
});