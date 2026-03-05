import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtimeKey = ({ songId, userId, isLeader, initialSemitones = 0 }) => {
  const [semitones, setSemitones] = useState(initialSemitones)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)

  const channelName = `song-key-${songId}`

  useEffect(() => {
    if (!songId || !syncEnabled) return

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    })

    channel
      .on('broadcast', { event: 'key-change' }, ({ payload }) => {
        if (!isLeader) {
          setSemitones(payload.semitones)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setConnectedUsers(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, isLeader })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [songId, syncEnabled])

  const broadcastKey = useCallback(async (newSemitones) => {
    if (!syncEnabled || !isLeader) return
    const channel = supabase.channel(channelName)
    await channel.send({
      type: 'broadcast',
      event: 'key-change',
      payload: { semitones: newSemitones }
    })
  }, [syncEnabled, isLeader, channelName])

  return { semitones, setSemitones, syncEnabled, setSyncEnabled, connectedUsers, broadcastKey }
}