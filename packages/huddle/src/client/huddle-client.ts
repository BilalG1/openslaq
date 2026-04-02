import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  VideoPresets,
  type Participant,
} from "livekit-client";
import type { HuddleMediaState, ParticipantTrackInfo } from "./types";

type StateListener = (state: HuddleMediaState) => void;

function getParticipantInfo(participant: Participant): ParticipantTrackInfo {
  let isMuted = true;
  let isCameraOn = false;
  let isScreenSharing = false;
  let cameraTrack: MediaStreamTrack | null = null;
  let screenTrack: MediaStreamTrack | null = null;
  let audioTrack: MediaStreamTrack | null = null;

  for (const pub of participant.trackPublications.values()) {
    const track = pub.track;
    if (pub.source === Track.Source.Microphone) {
      isMuted = pub.isMuted;
      audioTrack = track?.mediaStreamTrack ?? null;
    } else if (pub.source === Track.Source.Camera) {
      isCameraOn = !pub.isMuted && !!track;
      cameraTrack = track?.mediaStreamTrack ?? null;
    } else if (pub.source === Track.Source.ScreenShare) {
      isScreenSharing = !pub.isMuted && !!track;
      screenTrack = track?.mediaStreamTrack ?? null;
    }
  }

  return {
    userId: participant.identity,
    isMuted,
    isCameraOn,
    isScreenSharing,
    isSpeaking: participant.isSpeaking,
    cameraTrack,
    screenTrack,
    audioTrack,
  };
}

export class HuddleClient {
  private room: Room;
  private listeners = new Set<StateListener>();
  private destroyed = false;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      publishDefaults: {
        videoEncoding: VideoPresets.h720.encoding,
        screenShareEncoding: VideoPresets.h1080.encoding,
      },
    });
    this.setupEventListeners();
  }

  async connect(wsUrl: string, token: string): Promise<void> {
    if (this.destroyed) throw new Error("HuddleClient is destroyed");
    await this.room.connect(wsUrl, token);
    this.notify();
  }

  async disconnect(): Promise<void> {
    await this.room.disconnect();
    this.notify();
  }

  async enableMicrophone(): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(true);
    this.notify();
  }

  async disableMicrophone(): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(false);
    this.notify();
  }

  async toggleMicrophone(): Promise<void> {
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    this.notify();
  }

  async enableCamera(): Promise<void> {
    await this.room.localParticipant.setCameraEnabled(true);
    this.notify();
  }

  async disableCamera(): Promise<void> {
    await this.room.localParticipant.setCameraEnabled(false);
    this.notify();
  }

  async toggleCamera(): Promise<void> {
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    this.notify();
  }

  async startScreenShare(): Promise<void> {
    await this.room.localParticipant.setScreenShareEnabled(true);
    this.notify();
  }

  async stopScreenShare(): Promise<void> {
    await this.room.localParticipant.setScreenShareEnabled(false);
    this.notify();
  }

  async switchAudioDevice(deviceId: string): Promise<void> {
    await this.room.switchActiveDevice("audioinput", deviceId);
    this.notify();
  }

  async switchVideoDevice(deviceId: string): Promise<void> {
    await this.room.switchActiveDevice("videoinput", deviceId);
    this.notify();
  }

  subscribe(callback: StateListener): () => void {
    this.listeners.add(callback);
    // Send current state immediately
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  getState(): HuddleMediaState {
    const connected = this.room.state === ConnectionState.Connected;
    const reconnecting = this.room.state === ConnectionState.Reconnecting;

    const participants: ParticipantTrackInfo[] = [];
    for (const p of this.room.remoteParticipants.values()) {
      participants.push(getParticipantInfo(p));
    }

    const localParticipant = connected
      ? getParticipantInfo(this.room.localParticipant)
      : null;

    return {
      connected,
      reconnecting,
      participants,
      localParticipant,
      error: null,
    };
  }

  /** Get the underlying LiveKit Room (for attaching video elements) */
  getRoom(): Room {
    return this.room;
  }

  destroy(): void {
    this.destroyed = true;
    this.room.disconnect();
    this.listeners.clear();
  }

  private notify(): void {
    if (this.destroyed) return;
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private setupEventListeners(): void {
    const notify = () => this.notify();

    this.room
      .on(RoomEvent.ParticipantConnected, notify)
      .on(RoomEvent.ParticipantDisconnected, notify)
      .on(RoomEvent.TrackSubscribed, notify)
      .on(RoomEvent.TrackUnsubscribed, notify)
      .on(RoomEvent.TrackMuted, notify)
      .on(RoomEvent.TrackUnmuted, notify)
      .on(RoomEvent.ActiveSpeakersChanged, notify)
      .on(RoomEvent.LocalTrackPublished, notify)
      .on(RoomEvent.LocalTrackUnpublished, notify)
      .on(RoomEvent.Reconnecting, notify)
      .on(RoomEvent.Reconnected, notify)
      .on(RoomEvent.Disconnected, notify)
      .on(RoomEvent.ConnectionStateChanged, notify);
  }
}
