
#import <UIKit/UIKit.h>
#import "MetaioSDKViewController.h"


@interface QMACyclopsVC : MetaioSDKViewController

@property (nonatomic, weak) UIManagedDocument *managedDocument;

- (void)onSDKReady;

@end
