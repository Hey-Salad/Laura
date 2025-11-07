# Laura Dashboard Deployment Guide

## Database Migration

### Run the camera_commands Table Migration

You need to run the SQL migration to create the `camera_commands` table in your Supabase database.

#### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251031_create_camera_commands.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

#### Option 2: Via Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Verify Migration

After running the migration, verify the table was created:

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM camera_commands LIMIT 1;
```

You should see an empty result (no rows yet), confirming the table exists.

## API Endpoints Available

Once the migration is complete, these endpoints will be functional:

### 1. Poll for Commands (Camera → Laura)
```
GET /api/cameras/{camera_id}/commands
```

Used by CircuitPython camera every 30 seconds to fetch pending commands.

### 2. Acknowledge Command (Camera → Laura)
```
POST /api/cameras/{camera_id}/commands/{command_id}/ack
Content-Type: application/json

{
  "status": "completed",
  "result": {
    "streaming": true,
    "message": "Video streaming started"
  }
}
```

Used by CircuitPython camera to report command execution results.

### 3. Command History (Dashboard → Laura)
```
GET /api/cameras/{camera_id}/command-history
```

Used by dashboard to display recent commands and their status.

### 4. Send Command (Dashboard → Laura)
```
POST /api/cameras/{camera_id}/command
Content-Type: application/json

{
  "command_type": "start_video",
  "payload": {}
}
```

Used by dashboard to send commands to camera.

## Testing the System

### 1. Test Command Creation (From Dashboard)

Go to https://laura.heysalad.app/cameras and:
1. Select your camera (CAM_CP_001 or CAM001)
2. Click any control button (e.g., "Start Video")
3. The command should appear in the "Command History" section with status "pending"

### 2. Test Command Polling (CircuitPython Camera)

Your CircuitPython camera automatically polls every 30 seconds. Check the serial console:

```
[Laura] Polling for commands...
[Laura] Received 1 command(s)
[Laura] Processing command: start_video
[Laura] ✓ Video streaming started
[Laura] Acknowledging command...
[Laura] ✓ Command acknowledged
```

### 3. Test Command Acknowledgment

After the camera executes the command:
1. Refresh the dashboard
2. The command status should change from "pending" to "completed"
3. You should see the result data (e.g., `{ "streaming": true }`)

## Troubleshooting

### Commands Not Appearing

**Issue**: Camera doesn't receive commands

**Solutions**:
1. Check if `camera_commands` table exists in Supabase
2. Verify camera is polling: Check serial console for `[Laura] Polling for commands...`
3. Check command was created: Query `SELECT * FROM camera_commands WHERE status = 'pending'`

### Commands Stay "Pending"

**Issue**: Commands never complete

**Solutions**:
1. Check CircuitPython camera serial console for errors
2. Verify camera is connected to Laura API (check registration)
3. Ensure camera can reach laura.heysalad.app (no firewall issues)

### Row Level Security Errors

**Issue**: `permission denied for table camera_commands`

**Solutions**:
1. Re-run the migration (includes RLS policies)
2. Or manually add policies in Supabase Dashboard → Authentication → Policies

## Command Types Supported

| Command | Description | Parameters |
|---------|-------------|------------|
| `start_video` | Start video streaming | none |
| `stop_video` | Stop video streaming | none |
| `take_photo` | Capture single photo | none |
| `save_photo` | Save current frame | none |
| `led_on` | Turn LED on (night vision) | none |
| `led_off` | Turn LED off | none |
| `toggle_led` | Toggle LED state | none |
| `play_sound` | Play buzzer sound | `{ "duration_ms": 1000 }` |
| `get_status` | Get device status | none |
| `change_location` | Update GPS location | `{ "location_id": "charlottenburg" }` |
| `update_settings` | Update device settings | `{ "settings": {...} }` |
| `reboot` | Reboot device | none |

## Dashboard Features

### Command History Panel

Located in the camera sidebar, shows:
- ✅ Recent commands (last 20)
- ✅ Real-time status updates (refreshes every 5s)
- ✅ Color-coded status badges
  - 🟢 Green: Completed
  - 🔴 Red: Failed
  - 🟡 Yellow: In Progress
  - ⚪ Gray: Pending
- ✅ Command results/error messages
- ✅ Timestamp (relative time: "5m ago")

### Control Buttons

All 8 camera control buttons now:
- ✅ Send commands to `camera_commands` table
- ✅ Show loading state while sending
- ✅ Display success/error toast notifications
- ✅ Automatically appear in command history

## Production Checklist

- [ ] Run database migration
- [ ] Test command creation from dashboard
- [ ] Verify camera polls for commands
- [ ] Confirm commands execute on camera
- [ ] Check acknowledgments appear in dashboard
- [ ] Test all 12 command types
- [ ] Monitor command history in real-time
- [ ] Verify error handling (failed commands)

## Next Steps

### Optional Enhancements

1. **Add Command Queue Limits**
   - Prevent command spam
   - Auto-delete old commands (>24h)

2. **Add Command Priority**
   - Urgent commands execute first
   - Queue ordering by priority

3. **Add Command Timeout**
   - Auto-fail commands after 5 minutes
   - Notify user of stuck commands

4. **Add Bulk Commands**
   - Send same command to multiple cameras
   - Schedule commands for later execution

5. **Add Command Templates**
   - Save frequently-used command sequences
   - One-click execution of complex workflows

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Edge Functions
2. Check browser console for API errors
3. Check CircuitPython serial console for camera errors
4. Verify database migration was successful
5. Test API endpoints directly with curl/Postman
