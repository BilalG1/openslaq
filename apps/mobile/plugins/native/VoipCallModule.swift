import Foundation
import AVFoundation
import PushKit
import CallKit
import React

// MARK: - Standalone PushKit/CallKit manager (no RCTEventEmitter dependency)

class VoipCallManager: NSObject, PKPushRegistryDelegate, CXProviderDelegate {
  static let shared = VoipCallManager()

  private var voipRegistry: PKPushRegistry?
  private var provider: CXProvider?
  var cachedVoipToken: String?

  // Track active calls: uuid -> metadata
  var activeCalls: [UUID: [String: String]] = [:]

  // Callback to notify the RN module when events occur
  var onTokenReceived: ((String) -> Void)?
  var onCallAnswered: (([String: String]) -> Void)?
  var onCallEnded: ((String) -> Void)?

  override init() {
    super.init()
    setupCallKit()
  }

  func startPushKit() {
    print("[VoipCallManager] startPushKit called")
    voipRegistry = PKPushRegistry(queue: .main)
    voipRegistry?.delegate = self
    voipRegistry?.desiredPushTypes = [.voIP]
    print("[VoipCallManager] PushKit registry configured, waiting for token...")
  }

  private func setupCallKit() {
    let config = CXProviderConfiguration()
    config.maximumCallGroups = 1
    config.maximumCallsPerCallGroup = 1
    config.supportsVideo = false
    config.supportedHandleTypes = [.generic]

    provider = CXProvider(configuration: config)
    provider?.setDelegate(self, queue: .main)
  }

  // MARK: - PKPushRegistryDelegate

  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    print("[VoipCallManager] Received VoIP token: \(token.prefix(20))...")
    cachedVoipToken = token
    onTokenReceived?(token)
  }

  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    guard type == .voIP else {
      completion()
      return
    }

    let data = payload.dictionaryPayload
    let pushType = data["type"] as? String ?? ""
    let uuidString = data["uuid"] as? String ?? UUID().uuidString
    let channelId = data["channelId"] as? String ?? ""
    let channelName = data["channelName"] as? String ?? "Huddle"
    let callerName = data["callerName"] as? String ?? "Someone"
    let workspaceSlug = data["workspaceSlug"] as? String ?? ""

    guard let uuid = UUID(uuidString: uuidString) else {
      let fallbackUuid = UUID()
      reportIncomingCall(uuid: fallbackUuid, callerName: callerName, channelName: channelName, channelId: channelId, workspaceSlug: workspaceSlug) {
        self.provider?.reportCall(with: fallbackUuid, endedAt: Date(), reason: .remoteEnded)
        completion()
      }
      return
    }

    if pushType == "huddle_cancel" {
      if activeCalls[uuid] != nil {
        provider?.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
        activeCalls.removeValue(forKey: uuid)
      } else {
        reportIncomingCall(uuid: uuid, callerName: callerName, channelName: channelName, channelId: channelId, workspaceSlug: workspaceSlug) {
          self.provider?.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
          completion()
        }
        return
      }
      completion()
    } else {
      reportIncomingCall(uuid: uuid, callerName: callerName, channelName: channelName, channelId: channelId, workspaceSlug: workspaceSlug) {
        completion()
      }
    }
  }

  private func reportIncomingCall(uuid: UUID, callerName: String, channelName: String, channelId: String, workspaceSlug: String, completion: @escaping () -> Void) {
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: channelId)
    update.localizedCallerName = "\(callerName) — #\(channelName)"
    update.hasVideo = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsHolding = false
    update.supportsDTMF = false

    activeCalls[uuid] = [
      "channelId": channelId,
      "workspaceSlug": workspaceSlug,
    ]

    provider?.reportNewIncomingCall(with: uuid, update: update) { error in
      if let error = error {
        print("[VoipCallManager] reportNewIncomingCall error: \(error)")
        self.activeCalls.removeValue(forKey: uuid)
      }
      completion()
    }
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    print("[VoipCallManager] VoIP push token invalidated")
    cachedVoipToken = nil
  }

  // MARK: - CXProviderDelegate

  func providerDidReset(_ provider: CXProvider) {
    activeCalls.removeAll()
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    let uuid = action.callUUID
    let callData = activeCalls[uuid] ?? [:]

    onCallAnswered?([
      "uuid": uuid.uuidString,
      "channelId": callData["channelId"] ?? "",
      "workspaceSlug": callData["workspaceSlug"] ?? "",
    ])

    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    let uuid = action.callUUID
    activeCalls.removeValue(forKey: uuid)
    onCallEnded?(uuid.uuidString)
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    NotificationCenter.default.post(name: NSNotification.Name("CallKitAudioSessionActivated"), object: audioSession)
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    NotificationCenter.default.post(name: NSNotification.Name("CallKitAudioSessionDeactivated"), object: audioSession)
  }

  // MARK: - Public API

  func endCall(_ uuidString: String) {
    guard let uuid = UUID(uuidString: uuidString) else { return }
    let endAction = CXEndCallAction(call: uuid)
    let transaction = CXTransaction(action: endAction)
    let controller = CXCallController()
    controller.request(transaction) { error in
      if let error = error {
        print("[VoipCallManager] endCall error: \(error)")
      }
    }
    activeCalls.removeValue(forKey: uuid)
  }

  func reportCallConnected(_ uuidString: String) {
    guard let uuid = UUID(uuidString: uuidString) else { return }
    provider?.reportOutgoingCall(with: uuid, connectedAt: Date())
  }
}

// MARK: - React Native bridge module

@objc(VoipCallModule)
class VoipCallModule: RCTEventEmitter {

  private let manager = VoipCallManager.shared

  override init() {
    super.init()
    print("[VoipCallModule] RN module init")

    manager.onTokenReceived = { [weak self] token in
      self?.sendEvent(withName: "voipTokenReceived", body: ["token": token])
    }
    manager.onCallAnswered = { [weak self] data in
      self?.sendEvent(withName: "callAnswered", body: data)
    }
    manager.onCallEnded = { [weak self] uuid in
      self?.sendEvent(withName: "callEnded", body: ["uuid": uuid])
    }
  }

  override static func moduleName() -> String! {
    return "VoipCallModule"
  }

  override func supportedEvents() -> [String]! {
    return ["voipTokenReceived", "callAnswered", "callEnded"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func startObserving() {
    print("[VoipCallModule] JS started observing")
    // If token was already received before JS was ready, send it now
    if let token = manager.cachedVoipToken {
      sendEvent(withName: "voipTokenReceived", body: ["token": token])
    }
  }

  override func stopObserving() {}

  @objc func getVoipToken(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(manager.cachedVoipToken as Any)
  }

  @objc func endCall(_ uuidString: String) {
    manager.endCall(uuidString)
  }

  @objc func reportCallConnected(_ uuidString: String) {
    manager.reportCallConnected(uuidString)
  }
}
