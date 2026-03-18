# Huddle Scaling Backlog

Ordered by first bottleneck to last. Current state: single LiveKit Docker container, 201 RTC ports, in-memory state, no TURN.

## 1. Expand RTC port range

- **Bottleneck**: 201 ports (50000-50200) caps out at ~100 concurrent participants
- **Fix**: Change `livekit.yaml` port range to 50000-60000
- **Difficulty**: 1 line config change
- **After**: ~5,000 concurrent participants (now CPU-bound instead of port-bound)

## 2. Add capacity gate on join endpoint

- **Bottleneck**: New users join into degraded calls with no warning when server is saturated
- **Fix**: Query total participant count via `RoomServiceClient.listRooms()` before allowing join. Return 503 "Huddle servers at capacity" when above threshold
- **Difficulty**: ~20 lines in huddle join route
- **After**: Same capacity ceiling, but clean failures instead of bad calls

## 3. Enable TURN

- **Bottleneck**: Users behind corporate firewalls / symmetric NATs can't connect at all
- **Fix**: Enable TURN in `livekit.yaml` (`turn.enabled: true`, `turn.udp_port: 3478`)
- **Difficulty**: Config change + open firewall ports
- **After**: Same capacity, but ~15-20% more users can actually establish connections

## 4. Persist huddle state in Postgres

- **Bottleneck**: `activeHuddles` / `userHuddle` are in-memory Maps — lost on API restart, prevents running multiple API instances
- **Fix**: Move huddle state to a Postgres table. Upsert on join, update on leave, delete on room_finished
- **Difficulty**: ~2-3 hours (new table, migrate service code)
- **After**: Same capacity, but survives deploys/crashes and unblocks horizontal API scaling

## 5. Dedicated LiveKit server hardware

- **Bottleneck**: Single LiveKit container sharing resources with app server caps out at a few hundred participants
- **Fix**: Deploy LiveKit on a dedicated machine (8+ cores, 10Gbps NIC)
- **Difficulty**: Infra change, no code changes
- **After**: ~2,000 audio-only / ~500 with video concurrent participants

## 6. Client-side quality adaptation

- **Bottleneck**: All users send full resolution even on bad connections, wasting server bandwidth
- **Fix**: Add `ConnectionQualityChanged` listener to auto-disable camera on poor connections, lower default capture resolution to h540
- **Difficulty**: ~30 lines across web and mobile clients
- **After**: Same ceiling, but fewer users hit it (bandwidth savings ~30-40%)

## 7. Multi-node LiveKit cluster (main scaling inflection point)

- **Bottleneck**: Single LiveKit node — hard ceiling on one machine regardless of config
- **Fix**: Add Redis for room-to-node coordination. Run multiple LiveKit nodes behind a load balancer. Each node handles its own rooms, Redis coordinates routing
- **Difficulty**: ~1 day infra work (Redis + orchestration), zero code changes to app
- **After**: ~5,000-10,000 concurrent participants (scales linearly with nodes)

## 8. Multi-region deployment

- **Bottleneck**: Single region — users far from server get 100ms+ latency, jitter, poor audio/video quality
- **Fix**: Deploy LiveKit nodes in multiple regions. Use GeoDNS or return region-specific `wsUrl` from the join endpoint based on client location
- **Difficulty**: Multi-region infra + ~50 lines to route users to nearest node
- **After**: ~10,000+ across regions with good quality globally

## 9. SFU cascading for cross-region rooms

- **Bottleneck**: If a room has participants in different regions, all media routes through one node
- **Fix**: Already built into LiveKit multi-node — just ensure inter-region network connectivity between LiveKit nodes
- **Difficulty**: Networking/firewall config only
- **After**: Same capacity, but dramatically better quality for rooms spanning regions

## 10. Async webhook processing

- **Bottleneck**: Thousands of join/leave events per second overwhelm the single `/api/huddle/webhook` endpoint
- **Fix**: Queue incoming webhooks into a lightweight job queue and process asynchronously
- **Difficulty**: ~half day
- **After**: Removes API server as bottleneck for huddle state updates

---

## Summary

- **Steps 1-3**: Production-viable with minimal effort (an afternoon)
- **Steps 4-6**: Hardening for reliability and UX (a day or two)
- **Step 7**: Real scaling inflection — multi-node breaks past single-machine limits
- **Steps 8-10**: Global scale

Realistic ceiling without multi-node (steps 1-6): **~500-2,000 concurrent participants** depending on video vs audio-only mix and server hardware. After step 7, capacity scales linearly by adding nodes.
