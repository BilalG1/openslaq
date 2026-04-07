#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(VoipCallModule, RCTEventEmitter)

RCT_EXTERN_METHOD(getVoipToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endCall:(NSString *)uuidString)

RCT_EXTERN_METHOD(reportCallConnected:(NSString *)uuidString)

@end
