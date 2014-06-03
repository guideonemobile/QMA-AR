
#import "QMACoreDataTBVC.h"

@class QMAPoiTBVC;
@class QMATarget;
@class QMAPoi;


@protocol QMAPoiTBVCDelegate <NSObject>

@optional
- (void)qmaPoiTBC:(QMAPoiTBVC *)qmaPoiTBC
     didSelectPOI:(QMAPoi *)poi;

@end


@interface QMAPoiTBVC : QMACoreDataTBVC

@property (nonatomic, weak) id <QMAPoiTBVCDelegate> delegate;
@property (nonatomic, weak) UIManagedDocument *managedDocument;
@property (nonatomic, strong) QMATarget *target;

@end
