---
name: reCamera Integration Issue
about: Report issues specific to reCamera/Node-RED integration
title: '[reCamera] '
labels: reCamera, integration
assignees: ''
---

## reCamera Details

**Model:** <!-- e.g., reCamera Gimbal, reCamera ESP32-S3 -->
**Firmware Version:** <!-- e.g., 1.0.0 -->
**Node-RED Version:** <!-- e.g., 3.1.0 -->

## Integration Component

<!-- Mark the relevant component with an 'x' -->

- [ ] AI Object Detection (YOLO11n)
- [ ] OpenAI Realtime API integration
- [ ] ElevenLabs TTS
- [ ] Gimbal control
- [ ] Laura API polling
- [ ] WebSocket connection
- [ ] Camera streaming (RTSP)
- [ ] Dashboard UI
- [ ] Audio output
- [ ] Command execution

## Issue Description

<!-- Clear description of the issue -->

## Node-RED Flow

<!-- If applicable, paste the relevant Node-RED flow configuration -->

```json
// Paste relevant flow configuration here
```

## Debug Output

<!-- Paste Node-RED debug output -->

```
Paste debug output here
```

## Network Information

**reCamera IP:** <!-- e.g., 192.168.1.106 -->
**Laura API:** <!-- e.g., https://laura.heysalad.app -->
**Cloudflare Worker:** <!-- e.g., wss://heysalad-openai-proxy.workers.dev -->

## Connection Status

<!-- Mark the status of each connection -->

- [ ] ✅ reCamera online
- [ ] ✅ Laura API reachable
- [ ] ✅ WebSocket proxy connected
- [ ] ✅ OpenAI API accessible
- [ ] ✅ ElevenLabs API accessible
- [ ] ❌ Gimbal responding
- [ ] ❌ Camera streaming
- [ ] ❌ Audio output working

## Configuration

**Camera ID:** <!-- e.g., recamera-gimbal-001 -->
**Camera UUID:** <!-- e.g., 34236c48-2dae-4fe6-9bae-27e640f84d71 -->
**Token Status:** <!-- Valid/Invalid/Not set -->

## Steps to Reproduce

1.
2.
3.

## Expected vs Actual Behavior

**Expected:**
<!-- What should happen -->

**Actual:**
<!-- What actually happens -->

## Error Messages

```
Paste any error messages from Node-RED or browser console
```

## Logs

<!-- Attach relevant logs from reCamera or Node-RED -->

## Additional Context

<!-- Any other relevant information -->

## Troubleshooting Attempted

<!-- List troubleshooting steps you've already tried -->

- [ ] Restarted Node-RED
- [ ] Redeployed flow
- [ ] Checked network connectivity
- [ ] Verified API credentials
- [ ] Checked token validation
- [ ] Reviewed debug output
- [ ] Tested with inject nodes

## Impact

<!-- How does this affect your use of the system? -->

- [ ] 🔴 Blocker - Cannot use reCamera at all
- [ ] 🟠 High - Major feature not working
- [ ] 🟡 Medium - Some features not working
- [ ] 🟢 Low - Minor inconvenience
