# Recurring chat stream recovery

## User request

Yes, released 1487 to production. Yes, archive those that are set to archive or replace. And yes, the three-agent can finish items now.

## Scope

This work owns the outstanding Fix Recurring Chat Stream Errors requests: automatic capacity recovery after 30 seconds, all three T3 servers, persistence through supported updates, and verification of the proxy's upstream WebSocket transport. Other agents own the release, archival, and broader remediation requests.

## Baseline

The September retry patch is merged in clintebbesen/t3code main through PR 4. The live local server now uses the upstream 0.0.45 native executable. Its Codex runtime no longer includes the custom capacity retry. Both remote Codex configurations still enable WebSockets. No live service has been restarted by this work.

## Write and concurrency expectations

Retries create no database or recurring storage of their own. At most five turn submissions per original accepted request, spaced by 30 seconds, with one pending timer per session. Stop, a new user request, and session closure must cancel pending recovery. Ordinary transport failures must not replay already executed tools.
