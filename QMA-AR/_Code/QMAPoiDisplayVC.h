
#import <UIKit/UIKit.h>

@class QMAPoi;


@interface QMAPoiDisplayVC : UIViewController

@property (nonatomic, weak) QMAPoi *currentPOI;
@property (nonatomic, strong) UIImage *panoramaScreenShot;

@end
