
#import <UIKit/UIKit.h>

@class QMAPoi;


@interface QMAPoiVC : UIViewController

@property (nonatomic, weak) QMAPoi *poi;

- (void)stopAudio;

@end
