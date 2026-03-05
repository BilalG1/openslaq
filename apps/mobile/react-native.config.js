module.exports = {
  dependencies: {
    // Exclude react-native-webrtc from iOS: livekit-react-native-webrtc
    // already bundles WebRTC-SDK, causing a webrtc.xcframework conflict.
    "react-native-webrtc": {
      platforms: {
        ios: null,
      },
    },
  },
};
